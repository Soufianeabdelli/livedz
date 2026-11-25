/**
 * Creates orders from parsed live-comment intents, records viewer questions,
 * and expires unclaimed live drafts to release reserved stock.
 */

import { prisma } from "@/lib/db";
import { isStockCheckViolation } from "@/lib/db-errors";
import { releaseReserved } from "@/lib/stock-ops";
import { extractProductCode, parseComment } from "./parser";
import type { LiveOrderResult, ParsedIntent } from "./types";

/** Anti-spam deduplication window for the same viewer + product pair (ms). */
const DEDUP_WINDOW_MS = 10 * 60_000; // 10 minutes

class OutOfStock extends Error {
  constructor() {
    super("out_of_stock");
  }
}

export function normalizeTiktokHandle(raw: string): string {
  return raw.replace(/^@/, "").trim().toLowerCase();
}

function buildIdempotencyKey(
  uniqueId: string,
  productCode: string,
  msgId?: string,
): string {
  if (msgId) return `live:msg:${msgId}`;
  const window = Math.floor(Date.now() / DEDUP_WINDOW_MS);
  return `live:${normalizeTiktokHandle(uniqueId)}:${productCode}:${window}`;
}

export type CreateLiveOrderInput = {
  merchantId: string;
  liveSessionId?: string;
  msgId?: string;
  uniqueId: string;
  nickname: string;
  rawComment?: string;
  intent: ParsedIntent & { match: true };
};

export async function createLiveOrder(input: CreateLiveOrderInput): Promise<LiveOrderResult> {
  const { merchantId, liveSessionId, msgId, uniqueId, nickname, rawComment } = input;
  const handle = normalizeTiktokHandle(uniqueId);

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { liveCodePrefix: true, draftHoldMinutes: true },
  });
  if (!merchant) return { ok: false, reason: "product_not_found" };

  // Re-resolve intent against actual product variant catalog when rawComment is supplied
  let intent = input.intent;
  const candidateCode = rawComment
    ? extractProductCode(rawComment, merchant.liveCodePrefix) ?? intent.productCode
    : intent.productCode;

  const product = await prisma.product.findFirst({
    where: { merchantId, code: candidateCode, isActive: true },
    include: { variants: true },
  });
  if (!product || product.variants.length === 0) {
    return { ok: false, reason: "product_not_found" };
  }

  if (rawComment) {
    const knownSizes = product.variants.map((v) => v.size).filter(Boolean);
    const knownColors = product.variants.map((v) => v.color).filter(Boolean);
    const reParsed = parseComment(rawComment, {
      codePrefix: merchant.liveCodePrefix,
      knownSizes,
      knownColors,
    });
    if (reParsed.match) intent = reParsed;
  }

  // Pick best matching in-stock variant (exact size+color > size > color > any in-stock)
  const qty = Math.min(Math.max(intent.quantity, 1), 5);
  const wantSize = intent.size?.toLowerCase();
  const wantColor = intent.color?.toLowerCase();

  const sortedVariants = [...product.variants].sort((a, b) => {
    const score = (v: typeof a) =>
      (wantSize && v.size.toLowerCase() === wantSize ? 4 : 0) +
      (wantColor && v.color.toLowerCase() === wantColor ? 2 : 0) +
      (v.stock - v.reserved >= qty ? 1 : 0);
    return score(b) - score(a);
  });
  const variant = sortedVariants.find((v) => v.stock - v.reserved >= qty) ?? sortedVariants[0];

  const key = buildIdempotencyKey(handle, product.code, msgId);

  // 1) Exact msgId or time-window idempotency check
  const existing = await prisma.order.findUnique({
    where: { merchantId_idempotencyKey: { merchantId, idempotencyKey: key } },
    select: { id: true, totalDzd: true },
  });
  if (existing) {
    return { ok: true, orderId: existing.id, productName: product.name, totalDzd: existing.totalDzd, duplicate: true };
  }

  // 2) Anti-spam guard: same viewer already has an active unclaimed DRAFT for this product recently
  const recentCutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
  const recentSameViewer = await prisma.order.findFirst({
    where: {
      merchantId,
      source: "LIVE_COMMENT",
      status: "DRAFT",
      tiktokUsername: handle,
      createdAt: { gte: recentCutoff },
      items: { some: { variant: { productId: product.id } } },
    },
    select: { id: true, totalDzd: true },
  });
  if (recentSameViewer) {
    return {
      ok: true,
      orderId: recentSameViewer.id,
      productName: product.name,
      totalDzd: recentSameViewer.totalDzd,
      duplicate: true,
    };
  }

  const holdMinutes = Math.max(merchant.draftHoldMinutes, 5);
  const draftExpiresAt = new Date(Date.now() + holdMinutes * 60_000);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const reserved = await tx.$executeRaw`
        UPDATE "Variant"
        SET "reserved" = "reserved" + ${qty}::int
        WHERE "id" = ${variant.id}
          AND "stock" - "reserved" >= ${qty}::int`;
      if (reserved !== 1) throw new OutOfStock();

      return tx.order.create({
        data: {
          merchantId,
          status: "DRAFT",
          source: "LIVE_COMMENT",
          idempotencyKey: key,
          liveSessionId: liveSessionId ?? null,
          tiktokUsername: handle,
          tiktokMsgId: msgId ?? null,
          customerName: `@${handle}`,
          draftExpiresAt,
          note: `TikTok Live: ${nickname} asked for ${product.code}${intent.size ? ` size ${intent.size}` : ""}${intent.color ? ` ${intent.color}` : ""} (qty ${qty})`,
          totalDzd: product.priceDzd * qty,
          items: {
            create: {
              variantId: variant.id,
              productName: product.name,
              quantity: qty,
              unitPriceDzd: product.priceDzd,
            },
          },
        },
        select: { id: true, totalDzd: true },
      });
    });

    return {
      ok: true,
      orderId: order.id,
      productName: product.name,
      totalDzd: order.totalDzd,
      duplicate: false,
    };
  } catch (e) {
    const again = await prisma.order.findUnique({
      where: { merchantId_idempotencyKey: { merchantId, idempotencyKey: key } },
      select: { id: true, totalDzd: true },
    });
    if (again) {
      return { ok: true, orderId: again.id, productName: product.name, totalDzd: again.totalDzd, duplicate: true };
    }
    if (e instanceof OutOfStock || isStockCheckViolation(e)) return { ok: false, reason: "out_of_stock" };
    console.error("[live-order] createLiveOrder failed", e);
    return { ok: false, reason: "db_error" };
  }
}

export async function recordLiveQuestion(input: {
  merchantId: string;
  liveSessionId?: string;
  uniqueId: string;
  productCode?: string;
  comment: string;
  msgId?: string;
}): Promise<void> {
  await prisma.liveQuestion.create({
    data: {
      merchantId: input.merchantId,
      liveSessionId: input.liveSessionId ?? null,
      tiktokUsername: normalizeTiktokHandle(input.uniqueId),
      productCode: input.productCode ?? null,
      comment: input.comment.slice(0, 240),
      msgId: input.msgId ?? null,
    },
  });
}

/**
 * Releases reserved stock for unclaimed LIVE_COMMENT DRAFT orders past their expiry.
 * Safe to run concurrently from multiple worker ticks.
 */
export async function expireStaleLiveDrafts(now = new Date()): Promise<number> {
  const candidates = await prisma.order.findMany({
    where: {
      status: "DRAFT",
      source: "LIVE_COMMENT",
      draftExpiresAt: { lt: now },
    },
    take: 100,
    select: {
      id: true,
      items: { select: { variantId: true, quantity: true } },
    },
  });

  let expired = 0;
  for (const o of candidates) {
    const didExpire = await prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: { id: o.id, status: "DRAFT" },
        data: { status: "EXPIRED" },
      });
      if (res.count !== 1) return false;
      await releaseReserved(tx, o.items);
      return true;
    });
    if (didExpire) expired++;
  }
  return expired;
}
