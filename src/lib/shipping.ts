import "server-only";
import { loadCredentials } from "@/lib/courier-accounts";
import { createParcel } from "@/lib/couriers/dzship";
import { getCourier } from "@/lib/couriers/registry";
import { prisma } from "@/lib/db";

export type ShipOutcome =
  | { ok: true; trackingNumber: string }
  | {
      ok: false;
      error:
        | "not_found" | "not_confirmed" | "no_courier_account" | "missing_data"
        | "courier_rejected" | "credentials_rejected" | "rate_limited" | "courier_unavailable";
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

  // Atomic claim: only one caller can move CONFIRMED to SHIPMENT_PENDING
  const claim = await prisma.order.updateMany({
    where: { id: orderId, merchantId, status: "CONFIRMED" },
    data: { status: "SHIPMENT_PENDING", courier: courierKey },
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
      codAmount: order.totalDzd, // products only, delivery fee is not included
      reference: order.id,
    },
  );

  if (!res.ok) {
    await prisma.order.updateMany({
      where: { id: orderId, merchantId, status: "SHIPMENT_PENDING" },
      data: { status: "CONFIRMED", courier: null },
    });
    console.error("[ship] rejected", { orderId, code: res.error, status: res.status });
    const e = res.error;
    const error =
      e === "credentials_rejected" ? "credentials_rejected"
      : e === "rate_limited" ? "rate_limited"
      : e === "courier_unavailable" || e === "network_error" ? "courier_unavailable"
      : "courier_rejected";
    return { ok: false, error, fields: res.fields };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "SHIPPED", trackingNumber: res.trackingNumber },
      });
      for (const it of order.items) {
        await tx.$executeRaw`UPDATE "Variant" SET "stock" = GREATEST("stock" - ${it.quantity}::int, 0), "reserved" = GREATEST("reserved" - ${it.quantity}::int, 0) WHERE "id" = ${it.variantId}`;
      }
    });
  } catch (e) {
    // The courier already accepted the parcel: keep the tracking number so nothing is lost
    console.error("[ship] saved at courier but not in db", { orderId, tracking: res.trackingNumber, err: e instanceof Error ? e.name : "unknown" });
    await prisma.order.updateMany({ where: { id: orderId, merchantId }, data: { trackingNumber: res.trackingNumber } }).catch(() => {});
  }
  return { ok: true, trackingNumber: res.trackingNumber };
}