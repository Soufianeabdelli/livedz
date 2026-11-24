import { prisma } from "@/lib/db";
import { canTransition, type Status } from "@/lib/order-status";
import { recordDeliveryOutcome } from "@/lib/reputation";

const COURIER_STATUS_MAP: Record<string, Status> = {
  out_for_delivery: "OUT_FOR_DELIVERY",
  in_transit: "OUT_FOR_DELIVERY",
  en_livraison: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  livre: "DELIVERED",
  livré: "DELIVERED",
  cash_collected: "CASH_COLLECTED",
  encaisse: "CASH_COLLECTED",
  encaissé: "CASH_COLLECTED",
  returned: "RETURNED",
  retour: "RETURNED",
  retourne: "RETURNED",
  retourné: "RETURNED",
  failed: "FAILED",
  echec: "FAILED",
};

export function mapCourierStatus(raw: string): Status | null {
  return COURIER_STATUS_MAP[raw.trim().toLowerCase()] ?? null;
}

export type SyncResult =
  | { ok: true; orderId: string; status: Status }
  | { ok: false; error: "unknown_status" | "not_found" | "invalid_transition" };

/**
 * Applies a courier tracking status update (from webhook or polling):
 * - validates state transition
 * - restocks physical inventory on RETURNED
 * - updates BuyerReputation on DELIVERED / RETURNED
 */
export async function syncCourierOrderStatus(input: {
  trackingNumber?: string;
  orderId?: string;
  merchantId?: string;
  courierStatus: string;
}): Promise<SyncResult> {
  const target = mapCourierStatus(input.courierStatus);
  if (!target) return { ok: false, error: "unknown_status" };

  const where = input.orderId
    ? { id: input.orderId, ...(input.merchantId ? { merchantId: input.merchantId } : {}) }
    : input.trackingNumber
      ? { trackingNumber: input.trackingNumber, ...(input.merchantId ? { merchantId: input.merchantId } : {}) }
      : null;
  if (!where) return { ok: false, error: "not_found" };

  const order = await prisma.order.findFirst({
    where,
    include: { items: { select: { variantId: true, quantity: true } } },
  });
  if (!order) return { ok: false, error: "not_found" };

  if (order.status === target) return { ok: true, orderId: order.id, status: target };
  if (!canTransition(order.status as Status, target)) {
    return { ok: false, error: "invalid_transition" };
  }

  const changed = await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: target },
    });
    if (res.count !== 1) return false;

    if (target === "RETURNED") {
      // Parcel was previously shipped (stock deducted), so return physical stock to inventory
      for (const it of order.items) {
        await tx.$executeRaw`
          UPDATE "Variant"
          SET "stock" = "stock" + ${it.quantity}::int
          WHERE "id" = ${it.variantId}`;
      }
    }
    return true;
  });

  if (!changed) return { ok: false, error: "invalid_transition" };

  if (target === "RETURNED") {
    await recordDeliveryOutcome(order.merchantId, order.phone, "RETURNED");
  } else if (target === "DELIVERED") {
    await recordDeliveryOutcome(order.merchantId, order.phone, "DELIVERED");
  }

  return { ok: true, orderId: order.id, status: target };
}
