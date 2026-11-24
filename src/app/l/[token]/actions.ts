"use server";

import { headers } from "next/headers";
import {
  claimLiveOrdersFromForm,
  findClaimableOrders,
  lookupClaimSession,
  type ClaimResult,
} from "@/lib/live/claim";
import { orderLimiter } from "@/lib/rate-limit";

export type LookupState = {
  orders: Array<{
    id: string;
    totalDzd: number;
    items: Array<{ productName: string; quantity: number; variantLabel: string }>;
  }>;
  error?: string;
};

export async function lookupLiveOrders(
  sessionToken: string,
  tiktokHandle: string,
): Promise<LookupState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (!orderLimiter(`lookup:${ip}`)) {
    return { orders: [], error: "Trop de tentatives. Reessayez plus tard." };
  }

  const session = await lookupClaimSession(sessionToken);
  if (!session) return { orders: [], error: "Session introuvable." };

  const clean = tiktokHandle.replace(/^@/, "").trim();
  if (clean.length < 2) return { orders: [], error: "Entrez votre pseudo TikTok." };

  const rows = await findClaimableOrders(session.merchantId, clean);
  if (rows.length === 0) {
    return { orders: [], error: "Aucune commande trouvee pour ce pseudo (ou delai expire)." };
  }

  return {
    orders: rows.map((r) => ({
      id: r.id,
      totalDzd: r.totalDzd,
      items: r.items.map((it) => ({
        productName: it.productName,
        quantity: it.quantity,
        variantLabel: [it.variant.size, it.variant.color].filter(Boolean).join(" - "),
      })),
    })),
  };
}

export type ClaimFormState = ClaimResult | { ok: false; error: "idle" } | { ok: false; error: "rate_limited" };

export async function submitLiveClaim(
  _prev: ClaimFormState,
  fd: FormData,
): Promise<ClaimFormState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (!orderLimiter(`claim:${ip}`)) {
    return { ok: false, error: "rate_limited" };
  }
  return claimLiveOrdersFromForm(fd);
}
