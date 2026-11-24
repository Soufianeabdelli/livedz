import { prisma } from "@/lib/db";
import type { CallOutcome } from "@/generated/prisma/enums";
import { canTransition, type Status } from "@/lib/order-status";

export type RecordCallResult =
  | { ok: true; callAttempts: number; newStatus: Status }
  | { ok: false; error: "not_found" | "invalid_transition" };

export async function recordCallAttempt(input: {
  merchantId: string;
  orderId: string;
  userId?: string;
  outcome: CallOutcome;
  note?: string;
}): Promise<RecordCallResult> {
  const { merchantId, orderId, userId, outcome, note } = input;
  const now = new Date();

  return prisma.$transaction(async (tx): Promise<RecordCallResult> => {
    const order = await tx.order.findFirst({
      where: { id: orderId, merchantId },
      select: {
        id: true,
        status: true,
        callAttempts: true,
        items: { select: { variantId: true, quantity: true } },
      },
    });
    if (!order) return { ok: false, error: "not_found" };

    const nextAttempts = order.callAttempts + 1;
    let targetStatus = order.status as Status;

    if (outcome === "CONFIRMED") {
      if (!canTransition(order.status as Status, "CONFIRMED")) {
        return { ok: false, error: "invalid_transition" };
      }
      targetStatus = "CONFIRMED";
    } else if (outcome === "CANCELLED") {
      if (!canTransition(order.status as Status, "CANCELLED")) {
        return { ok: false, error: "invalid_transition" };
      }
      targetStatus = "CANCELLED";
    } else if (
      (outcome === "NO_ANSWER" || outcome === "UNREACHABLE") &&
      nextAttempts >= 3 &&
      canTransition(order.status as Status, "AWAITING_CUSTOMER")
    ) {
      targetStatus = "AWAITING_CUSTOMER";
    }

    await tx.callLog.create({
      data: {
        orderId,
        merchantId,
        userId: userId ?? null,
        outcome,
        note: note?.slice(0, 200) ?? null,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: {
        callAttempts: nextAttempts,
        lastCallAt: now,
        lastCallOutcome: outcome,
        status: targetStatus,
      },
    });

    if (targetStatus === "CANCELLED" && order.status !== "CANCELLED") {
      for (const it of order.items) {
        await tx.$executeRaw`
          UPDATE "Variant"
          SET "reserved" = GREATEST("reserved" - ${it.quantity}::int, 0)
          WHERE "id" = ${it.variantId}`;
      }
    }

    return { ok: true, callAttempts: nextAttempts, newStatus: targetStatus };
  });
}
