"use server";

import { revalidatePath } from "next/cache";
import { getMerchantContext } from "@/lib/merchant";
import { changeOrderStatus } from "@/lib/merchant-orders";
import { getSessionUser } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string };

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