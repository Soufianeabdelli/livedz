/**
 * Live-comment buyer claim flow (`/l/{sessionToken}`).
 *
 * Buyers who commented during a TikTok Live open the seller's `/l/{sessionToken}`
 * link, enter their TikTok @username, review their reserved DRAFT comment-orders,
 * and submit their phone + delivery details.
 */

import { z } from "zod";
import { prisma } from "@/lib/db";
import { resolveDzRegion } from "@/lib/countries/dz/regions";
import { normalizeDzPhone } from "@/lib/phone";
import { CARD_TOKEN_RE } from "@/lib/token";
import { getDeliveryFee } from "@/lib/delivery-rates";
import { normalizeTiktokHandle } from "./orders";

export const ClaimInput = z
  .object({
    sessionToken: z.string().regex(CARD_TOKEN_RE),
    tiktokHandle: z.string().trim().min(2).max(50),
    customerName: z.string().trim().min(2).max(60),
    phone: z.string().transform((v, ctx) => {
      const p = normalizeDzPhone(v);
      if (!p) {
        ctx.addIssue({ code: "custom", message: "invalid_phone" });
        return z.NEVER;
      }
      return p;
    }),
    officialRegionKey: z.string().min(1),
    wilayaCode: z.coerce.number().int().min(1).max(58),
    commune: z.string().trim().min(2).max(80),
    deliveryType: z.enum(["HOME", "STOPDESK"]),
    address: z.string().trim().max(200).optional(),
    messagingConsent: z.boolean().default(false),
  })
  .superRefine((o, ctx) => {
    if (o.deliveryType === "HOME" && (!o.address || o.address.length < 5)) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "address_required" });
    }
  });

export type ClaimInput = z.infer<typeof ClaimInput>;

export async function lookupClaimSession(sessionToken: string) {
  if (!CARD_TOKEN_RE.test(sessionToken)) return null;
  return prisma.liveSession.findUnique({
    where: { sessionToken },
    select: {
      id: true,
      merchantId: true,
      tiktokUsername: true,
      status: true,
      merchant: {
        select: {
          name: true,
          deliveryRates: {
            select: { wilayaCode: true, homeDzd: true, stopdeskDzd: true },
          },
        },
      },
    },
  });
}

export async function findClaimableOrders(merchantId: string, tiktokHandle: string, now = new Date()) {
  const handle = normalizeTiktokHandle(tiktokHandle);
  if (!handle) return [];

  return prisma.order.findMany({
    where: {
      merchantId,
      source: "LIVE_COMMENT",
      status: "DRAFT",
      tiktokUsername: handle,
      OR: [{ draftExpiresAt: null }, { draftExpiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      totalDzd: true,
      createdAt: true,
      draftExpiresAt: true,
      items: {
        select: {
          productName: true,
          quantity: true,
          unitPriceDzd: true,
          variant: { select: { size: true, color: true } },
        },
      },
    },
  });
}

export type ClaimResult =
  | {
      ok: true;
      claimedCount: number;
      orderRefs: string[];
      productsTotalDzd: number;
      shippingFeeDzd: number;
      grandTotalDzd: number;
    }
  | { ok: false; error: "session_not_found" | "no_pending_orders" | "invalid_input"; fields?: string[] };

export async function claimLiveOrdersFromForm(fd: FormData): Promise<ClaimResult> {
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };

  const region = resolveDzRegion(str("region"));
  const parsed = ClaimInput.safeParse({
    sessionToken: str("sessionToken"),
    tiktokHandle: str("tiktokHandle"),
    customerName: str("customerName"),
    phone: str("phone"),
    officialRegionKey: region?.key ?? "",
    wilayaCode: region?.courierCode ?? 0,
    commune: str("commune"),
    deliveryType: str("deliveryType"),
    address: str("address") || undefined,
    messagingConsent: str("consent") === "on",
  });

  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "")))].map((f) =>
      f === "wilayaCode" || f === "officialRegionKey" ? "region" : f,
    );
    return { ok: false, error: "invalid_input", fields };
  }

  return claimLiveOrders(parsed.data);
}

export async function claimLiveOrders(input: ClaimInput, now = new Date()): Promise<ClaimResult> {
  const session = await lookupClaimSession(input.sessionToken);
  if (!session) return { ok: false, error: "session_not_found" };

  const drafts = await findClaimableOrders(session.merchantId, input.tiktokHandle, now);
  if (drafts.length === 0) return { ok: false, error: "no_pending_orders" };

  const shippingFeeDzd = await getDeliveryFee(session.merchantId, input.wilayaCode, input.deliveryType);
  const draftIds = drafts.map((d) => d.id);

  const claimed = await prisma.$transaction(async (tx) => {
    // Re-read inside transaction to prevent concurrent claim / expiry races
    const stillValid = await tx.order.findMany({
      where: {
        id: { in: draftIds },
        merchantId: session.merchantId,
        status: "DRAFT",
        OR: [{ draftExpiresAt: null }, { draftExpiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, totalDzd: true },
    });
    if (stillValid.length === 0) return [];

    // Apply shipping fee once on the primary order in the claimed batch
    const [primary, ...rest] = stillValid;
    await tx.order.update({
      where: { id: primary.id },
      data: {
        status: "PENDING_CONFIRMATION",
        customerName: input.customerName,
        phone: input.phone,
        wilayaCode: input.wilayaCode,
        officialRegionKey: input.officialRegionKey,
        commune: input.commune,
        deliveryType: input.deliveryType,
        address: input.address || null,
        shippingFeeDzd,
        messagingConsent: input.messagingConsent,
        consentAt: input.messagingConsent ? now : null,
        claimedAt: now,
        draftExpiresAt: null,
      },
    });

    if (rest.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: rest.map((r) => r.id) }, status: "DRAFT" },
        data: {
          status: "PENDING_CONFIRMATION",
          customerName: input.customerName,
          phone: input.phone,
          wilayaCode: input.wilayaCode,
          officialRegionKey: input.officialRegionKey,
          commune: input.commune,
          deliveryType: input.deliveryType,
          address: input.address || null,
          shippingFeeDzd: 0,
          messagingConsent: input.messagingConsent,
          consentAt: input.messagingConsent ? now : null,
          claimedAt: now,
          draftExpiresAt: null,
        },
      });
    }

    return stillValid;
  });

  if (claimed.length === 0) return { ok: false, error: "no_pending_orders" };

  const productsTotalDzd = claimed.reduce((sum, o) => sum + o.totalDzd, 0);
  return {
    ok: true,
    claimedCount: claimed.length,
    orderRefs: claimed.map((o) => o.id.slice(-6).toUpperCase()),
    productsTotalDzd,
    shippingFeeDzd,
    grandTotalDzd: productsTotalDzd + shippingFeeDzd,
  };
}
