"use server";

import { revalidatePath } from "next/cache";
import { prisma as db } from "@/lib/db";
import { requireMerchant } from "@/lib/require-merchant";
import { storeProfileSchema } from "@/lib/store-profile";

export type ProfileActionState = {
  ok: boolean;
  errors?: Record<string, string[] | undefined>;
};

export async function saveStoreProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const merchantId = await requireMerchant(); // derived from the session only

  const parsed = storeProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    tagline: formData.get("tagline") || undefined,
    category: formData.get("category"),
    city: formData.get("city") || undefined,
    whatsapp: formData.get("whatsapp") || "",
    accentColor: formData.get("accentColor") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  await db.storeProfile.upsert({
    where: { merchantId },
    create: { merchantId, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/dashboard/profile");
  return { ok: true };
}