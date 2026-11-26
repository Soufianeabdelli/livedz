"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/require-merchant";
import {
  updateActiveCardForMerchant,
  updateOverlayHiddenForMerchant,
  updateOverlayPlatformForMerchant,
} from "@/lib/overlay-state";

export async function setActiveCard(cardId: string) {
  const merchantId = await requireMerchant();
  const ok = await updateActiveCardForMerchant(merchantId, cardId);
  if (!ok) throw new Error("Card not found");
  revalidatePath("/dashboard/live/remote");
  return { ok: true as const, activeCardId: cardId };
}

export async function setOverlayPlatform(rawPlatform: string) {
  const merchantId = await requireMerchant();
  const platform = await updateOverlayPlatformForMerchant(merchantId, rawPlatform);
  revalidatePath("/dashboard/live/remote");
  return { ok: true as const, platform };
}

export async function setOverlayHidden(hidden: boolean) {
  const merchantId = await requireMerchant();
  await updateOverlayHiddenForMerchant(merchantId, hidden);
  revalidatePath("/dashboard/live/remote");
  return { ok: true as const, hidden };
}
