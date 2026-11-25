import "server-only";
import { loadCredentials } from "@/lib/courier-accounts";
import { createParcel, findParcelByReference } from "@/lib/couriers/dzship";
import { getCourier } from "@/lib/couriers/registry";
import { prisma } from "@/lib/db";
import { commitReserved } from "@/lib/stock-ops";

export type ShipOutcome =
  | { ok: true; trackingNumber: string }
  | {
      ok: false;
      error:
        | "not_found"
        | "not_confirmed"
        | "no_courier_account"
        | "missing_data"
        | "courier_rejected"
        | "credentials_rejected"
        | "rate_limited"
        | "courier_unavailable"
        | "shipment_unknown";
      fields?: string[];
    };

export async function shipOrder(merchantId: string, orderId: string, courierKey: string): Promise<ShipOutcome> {
  if (!getCourier(courierKey)) return { ok: false, error: "no_courier_account" };

  let creds: { credentials?: Record<string, string>; fromWilaya?: number } = {};
  if (courierKey !== "sandbox") {
    const c = await loadCredentials(merchantId, courierKey);
    if (!c) return { ok: false, error: "no_courier_account" };
    creds = c;
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, merchantId },
    include: { items: { include: { variant: { select: { size: true, color: true } } } } },
  });
  if (!order) return { ok: false, error: "not_found" };
  if (order.status !== "CONFIRMED") return { ok: false, error: "not_confirmed" };

  const missing: string[] = [];
  if (!order.customerName) missing.push("customerName");
  if (!order.phone) missing.push("phone");
  if (!order.wilayaCode) missing.push("region");
  if (!order.commune) missing.push("commune");
  if (!order.deliveryType) missing.push("deliveryType");
  if (missing.length > 0) return { ok: false, error: "missing_data", fields: missing };

  const nextAttempt = order.shipAttempts + 1;
  const attemptKey = `${order.id}-a${nextAttempt}`;
  const reference = nextAttempt === 1 ? order.id : attemptKey;

  // Atomic claim: only one caller can move CONFIRMED to SHIPMENT_PENDING
  const claim = await prisma.order.updateMany({
    where: { id: orderId, merchantId, status: "CONFIRMED" },
    data: {
      status: "SHIPMENT_PENDING",
      courier: courierKey,
      shipAttempts: nextAttempt,
      shipmentAttemptKey: attemptKey,
    },
  });
  if (claim.count !== 1) return { ok: false, error: "not_confirmed" };

  const productList = order.items
    .map((i) => `${i.productName} ${i.variant.size}${i.variant.color ? " " + i.variant.color : ""} x${i.quantity}`)
    .join(", ")
    .slice(0, 150);

  const res = await createParcel(
    { courier: courierKey, credentials: creds.credentials, fromWilaya: creds.fromWilaya || undefined },
    {
      fullName: order.customerName!,
      phone: order.phone!,
      wilayaCode: order.wilayaCode!,
      communeName: order.commune!,
      address: order.address ?? undefined,
      deliveryType: order.deliveryType === "HOME" ? "home" : "stopdesk",
      productList,
      codAmount: order.totalDzd + order.shippingFeeDzd,
      reference,
      idempotencyKey: attemptKey,
    },
  );

  if (!res.ok) {
    // Ambiguous timeout/5xx: move to SHIPMENT_UNKNOWN instead of blind rollback to avoid duplicate parcels
    if (res.error === "network_error" || res.error === "courier_unavailable") {
      await prisma.order.updateMany({
        where: { id: orderId, merchantId, status: "SHIPMENT_PENDING" },
        data: { status: "SHIPMENT_UNKNOWN" },
      });
      console.error("[ship] ambiguous outcome -> SHIPMENT_UNKNOWN", { orderId, attemptKey, code: res.error });
      return { ok: false, error: "shipment_unknown" };
    }

    await prisma.order.updateMany({
      where: { id: orderId, merchantId, status: "SHIPMENT_PENDING" },
      data: { status: "CONFIRMED", courier: null },
    });
    console.error("[ship] rejected", { orderId, code: res.error, status: res.status });
    const e = res.error;
    const error =
      e === "credentials_rejected"
        ? "credentials_rejected"
        : e === "rate_limited"
          ? "rate_limited"
          : "courier_rejected";
    return { ok: false, error, fields: res.fields };
  }

  await commitShipped(orderId, merchantId, res.trackingNumber, order.items);
  return { ok: true, trackingNumber: res.trackingNumber };
}

async function commitShipped(
  orderId: string,
  merchantId: string,
  trackingNumber: string,
  items: Array<{ variantId: string; quantity: number }>,
) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "SHIPPED", trackingNumber },
      });
      await commitReserved(tx, items);
    });
  } catch (e) {
    console.error("[ship] saved at courier but not in db", {
      orderId,
      tracking: trackingNumber,
      err: e instanceof Error ? e.name : "unknown",
    });
    await prisma.order
      .updateMany({ where: { id: orderId, merchantId }, data: { trackingNumber } })
      .catch(() => {});
  }
}

export type ReconcileResult =
  | { ok: true; resolution: "shipped"; trackingNumber: string }
  | { ok: true; resolution: "released_for_retry" }
  | { ok: false; error: "not_found" | "not_unknown" | "no_courier_account" | "still_unknown" };

/**
 * Reconciles an order stuck in SHIPMENT_UNKNOWN by checking whether the parcel
 * was actually created at the courier using its attempt reference.
 */
export async function reconcileUnknownShipment(
  merchantId: string,
  orderId: string,
): Promise<ReconcileResult> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, merchantId },
    include: { items: { select: { variantId: true, quantity: true } } },
  });
  if (!order) return { ok: false, error: "not_found" };
  if (order.status !== "SHIPMENT_UNKNOWN") return { ok: false, error: "not_unknown" };

  const courierKey = order.courier;
  if (!courierKey || !getCourier(courierKey)) return { ok: false, error: "no_courier_account" };

  let creds: { credentials?: Record<string, string>; fromWilaya?: number } = {};
  if (courierKey !== "sandbox") {
    const c = await loadCredentials(merchantId, courierKey);
    if (!c) return { ok: false, error: "no_courier_account" };
    creds = c;
  }

  const ref = order.shipAttempts <= 1 ? order.id : order.shipmentAttemptKey || order.id;
  const lookup = await findParcelByReference(
    { courier: courierKey, credentials: creds.credentials, fromWilaya: creds.fromWilaya || undefined },
    ref,
  );

  if (lookup.found) {
    await commitShipped(order.id, merchantId, lookup.trackingNumber, order.items);
    return { ok: true, resolution: "shipped", trackingNumber: lookup.trackingNumber };
  }

  if (lookup.definiteNotFound) {
    await prisma.order.updateMany({
      where: { id: order.id, merchantId, status: "SHIPMENT_UNKNOWN" },
      data: { status: "CONFIRMED", courier: null },
    });
    return { ok: true, resolution: "released_for_retry" };
  }

  return { ok: false, error: "still_unknown" };
}
