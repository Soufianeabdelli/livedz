"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { dedupeByOffer } from "@/lib/offer-dedupe";
import { normalizeDigits } from "@/lib/store-profile";

export type GoState =
  | { status: "idle" }
  | { status: "not_found"; query: string }
  | { status: "multiple"; matches: Array<{ token: string; merchantName: string; productName: string; code: string }> };

export async function lookupCode(_prev: GoState, fd: FormData): Promise<GoState> {
  const raw = normalizeDigits(String(fd.get("code") ?? "")).trim();
  if (!raw) return { status: "not_found", query: "" };

  // 1) Exact card token match
  const byToken = await prisma.card.findFirst({
    where: { token: raw, isActive: true, product: { isActive: true } },
    select: { token: true },
  });
  if (byToken) redirect(`/q/${byToken.token}`);

  // 2) Optional "merchant-slug/code" format
  let slugFilter: string | undefined;
  let codePart = raw;
  if (raw.includes("/")) {
    const [s, ...rest] = raw.split("/");
    slugFilter = s.trim().toLowerCase();
    codePart = rest.join("/").trim();
  }
  const cleanCode = codePart.replace(/^#/, "").trim();
  if (!cleanCode) return { status: "not_found", query: raw };

  const cards = await prisma.card.findMany({
    where: {
      isActive: true,
      ...(slugFilter ? { merchant: { slug: { equals: slugFilter, mode: "insensitive" } } } : {}),
      product: { isActive: true, code: { equals: cleanCode, mode: "insensitive" } },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      token: true,
      merchantId: true,
      productId: true,
      affiliateId: true,
      merchant: { select: { name: true } },
      product: { select: { code: true, name: true } },
    },
  });

  const unique = dedupeByOffer(cards).filter(
    (c): c is typeof c & { product: NonNullable<typeof c.product> } => c.product !== null,
  );

  if (unique.length === 1) redirect(`/q/${unique[0].token}`);

  if (unique.length > 1) {
    const merchantIds: string[] = [];
    for (const c of unique) merchantIds.push(c.merchantId);

    const profiles = await prisma.storeProfile.findMany({
      where: { merchantId: { in: merchantIds } },
      select: { merchantId: true, displayName: true },
    });

    const displayMap = new Map<string, string>();
    for (const p of profiles) displayMap.set(p.merchantId, p.displayName.trim());

    const matches = [];
    for (const c of unique.slice(0, 6)) {
      const { name: fallbackName } = c.merchant;
      const { name: productTitle, code } = c.product;
      matches.push({
        token: c.token,
        merchantName: displayMap.get(c.merchantId) || fallbackName,
        productName: productTitle,
        code,
      });
    }

    return { status: "multiple", matches };
  }

  return { status: "not_found", query: raw };
}
