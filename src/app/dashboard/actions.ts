"use server";

import { revalidatePath } from "next/cache";
import type { CallOutcome } from "@/generated/prisma/enums";
import { recordCallAttempt } from "@/lib/call-confirm";
import { getMerchantContext } from "@/lib/merchant";
import { changeOrderStatus } from "@/lib/merchant-orders";
import { getSessionUser } from "@/lib/session";
import { reconcileUnknownShipment, shipOrder } from "@/lib/shipping";

export type ActionState = { ok: boolean; error?: string; detail?: string };

const VALID_CALL_OUTCOMES = new Set<CallOutcome>([
  "CONFIRMED",
  "NO_ANSWER",
  "UNREACHABLE",
  "CANCELLED",
  "CALLBACK",
]);

export async function setOrderStatus(orderId: string, to: string): Promise<ActionState> {
  if (typeof orderId !== "string" || orderId.length < 1 || orderId.length > 40) {
    return { ok: false, error: "not_found" };
  }
  if (to !== "CONFIRMED" && to !== "CANCELLED") return { ok: false, error: "invalid_transition" };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const ctx = await getMerchantContext(user); // merchantId from the session only
  const r = await changeOrderStatus(ctx.merchantId, orderId, to);
  if (!r.ok) return { ok: false, error: r.error };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function logCallAction(orderId: string, outcome: string, note?: string): Promise<ActionState> {
  if (typeof orderId !== "string" || orderId.length < 1 || orderId.length > 40) {
    return { ok: false, error: "not_found" };
  }
  if (!VALID_CALL_OUTCOMES.has(outcome as CallOutcome)) {
    return { ok: false, error: "invalid_outcome" };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const ctx = await getMerchantContext(user);
  const r = await recordCallAttempt({
    merchantId: ctx.merchantId,
    orderId,
    userId: user.uid,
    outcome: outcome as CallOutcome,
    note,
  });
  if (!r.ok) return { ok: false, error: r.error };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function shipOrderAction(orderId: string, courierKey: string): Promise<ActionState> {
  if (typeof orderId !== "string" || orderId.length < 1 || orderId.length > 40) {
    return { ok: false, error: "not_found" };
  }
  if (typeof courierKey !== "string" || courierKey.length < 1 || courierKey.length > 40) {
    return { ok: false, error: "no_courier_account" };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const ctx = await getMerchantContext(user);
  const r = await shipOrder(ctx.merchantId, orderId, courierKey);
  revalidatePath("/dashboard");
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, detail: r.trackingNumber };
}

export async function reconcileShipmentAction(orderId: string): Promise<ActionState> {
  if (typeof orderId !== "string" || orderId.length < 1 || orderId.length > 40) {
    return { ok: false, error: "not_found" };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const ctx = await getMerchantContext(user);
  const r = await reconcileUnknownShipment(ctx.merchantId, orderId);
  revalidatePath("/dashboard");
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, detail: r.resolution === "shipped" ? r.trackingNumber : "retry_ready" };
}
