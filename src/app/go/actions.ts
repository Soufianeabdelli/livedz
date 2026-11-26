"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
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
    take: 6,
    orderBy: { createdAt: "desc" },
    select: {
      token: true,
      merchant: { select: { name: true } },
      product: { select: { code: true, name: true } },
    },
  });

  if (cards.length === 1) redirect(`/q/${cards[0].token}`);
  if (cards.length > 1) {
    return {
      status: "multiple",
      matches: cards.filter((c): c is typeof c & { product: NonNullable<typeof c.product> } => c.product !== null).map((c) => ({
        token: c.token,
        merchantName: c.merchant.name,
        productName: c.product.name,
        code: c.product.code,
      })),
    };
  }

  return { status: "not_found", query: raw };
}
