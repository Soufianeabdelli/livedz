import { prisma } from "@/lib/db";
import { allowedFrom } from "@/lib/order-status";
import { getReputationMap, type ReputationSummary } from "@/lib/reputation";

// Every query is scoped by merchantId, which comes from the verified session
export async function listOrders(merchantId: string, take = 50) {
  const rows = await prisma.order.findMany({
    where: { merchantId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      status: true,
      source: true,
      tiktokUsername: true,
      createdAt: true,
      customerName: true,
      phone: true,
      wilayaCode: true,
      officialRegionKey: true,
      commune: true,
      deliveryType: true,
      address: true,
      shippingFeeDzd: true,
      totalDzd: true,
      courier: true,
      trackingNumber: true,
      callAttempts: true,
      lastCallOutcome: true,
      draftExpiresAt: true,
      affiliate: { select: { handle: true } },
      items: { select: { productName: true, quantity: true, variant: { select: { size: true, color: true } } } },
    },
  });

  const repMap = await getReputationMap(
    merchantId,
    rows.map((r) => r.phone),
  );

  return rows.map((r) => ({
    ...r,
    reputation: (r.phone ? repMap.get(r.phone) : undefined) as ReputationSummary | undefined,
  }));
}

export type ChangeResult = { ok: true } | { ok: false; error: "not_found" | "invalid_transition" };

export function changeOrderStatus(
  merchantId: string,
  orderId: string,
  to: "CONFIRMED" | "CANCELLED",
): Promise<ChangeResult> {
  return prisma.$transaction(async (tx): Promise<ChangeResult> => {
    // One atomic update: only matches my order, in a state that may move to "to"
    const res = await tx.order.updateMany({
      where: { id: orderId, merchantId, status: { in: allowedFrom(to) } },
      data: { status: to },
    });
    if (res.count !== 1) {
      const exists = await tx.order.findFirst({ where: { id: orderId, merchantId }, select: { id: true } });
      return { ok: false, error: exists ? "invalid_transition" : "not_found" };
    }
    if (to === "CANCELLED") {
      const items = await tx.orderItem.findMany({ where: { orderId }, select: { variantId: true, quantity: true } });
      for (const it of items) {
        await tx.$executeRaw`UPDATE "Variant" SET "reserved" = GREATEST("reserved" - ${it.quantity}::int, 0) WHERE "id" = ${it.variantId}`;
      }
    }
    return { ok: true };
  });
}
