"use server";

import { revalidatePath } from "next/cache";
import { deleteCourierAccount, saveCourierAccount } from "@/lib/courier-accounts";
import { getCourier } from "@/lib/couriers/registry";
import { getMerchantContext } from "@/lib/merchant";
import { getSessionUser } from "@/lib/session";

export type SaveState = { ok: boolean; error?: string };

// Only the owner may manage courier keys. merchantId comes from the session.
async function ownerContext() {
  const user = await getSessionUser();
  if (!user) return null;
  const ctx = await getMerchantContext(user);
  return ctx.role === "OWNER" ? ctx : null;
}

export async function saveAccount(fd: FormData): Promise<SaveState> {
  const ctx = await ownerContext();
  if (!ctx) return { ok: false, error: "unauthorized" };

  const courier = String(fd.get("courier") ?? "");
  const def = getCourier(courier);
  if (!def) return { ok: false, error: "unknown_courier" };

  const values: Record<string, string> = {};
  for (const f of def.fields) values[f.key] = String(fd.get(`f_${f.key}`) ?? "");

  try {
    const r = await saveCourierAccount(ctx.merchantId, courier, values, Number(fd.get("fromWilaya") ?? 0));
    if (!r.ok) return { ok: false, error: r.error };
  } catch (e) {
    console.error("[shipping] save failed:", e instanceof Error ? e.name : "unknown"); // never log values
    return { ok: false, error: "server_error" };
  }
  revalidatePath("/dashboard/shipping");
  return { ok: true };
}

export async function removeAccount(courier: string): Promise<void> {
  const ctx = await ownerContext();
  if (!ctx || typeof courier !== "string" || courier.length > 40) return;
  await deleteCourierAccount(ctx.merchantId, courier);
  revalidatePath("/dashboard/shipping");
}