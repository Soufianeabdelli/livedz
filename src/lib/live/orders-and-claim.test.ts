import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { claimLiveOrders, findClaimableOrders } from "@/lib/live/claim";
import { createLiveOrder, expireStaleLiveDrafts } from "@/lib/live/orders";
import { startCapture } from "@/lib/live/session-manager";

const tag = randomBytes(4).toString("hex");
let merchantId = "";
let variant42Id = "";
let sessionToken = "";
let liveSessionId = "";

beforeAll(async () => {
  const m = await prisma.merchant.create({
    data: { name: "Live Shop", slug: `ls-${tag}`, liveCodePrefix: "P", draftHoldMinutes: 60 },
  });
  merchantId = m.id;

  const prod = await prisma.product.create({
    data: { merchantId, code: "P1", name: "Robe Satin", priceDzd: 3200 },
  });
  await prisma.variant.create({
    data: { productId: prod.id, size: "40", color: "Noir", stock: 2 },
  });
  const v42 = await prisma.variant.create({
    data: { productId: prod.id, size: "42", color: "Noir", stock: 5 },
  });
  variant42Id = v42.id;

  await prisma.deliveryRate.create({
    data: { merchantId, wilayaCode: 5, homeDzd: 700, stopdeskDzd: 400 },
  });

  const cap = await startCapture({ merchantId, tiktokUsername: "liveshop_dz" });
  if (!cap.ok) throw new Error("failed to start capture");
  sessionToken = cap.sessionToken;
  liveSessionId = cap.sessionId;
});

beforeEach(async () => {
  await prisma.order.deleteMany({ where: { merchantId } });
  await prisma.variant.updateMany({ where: { product: { merchantId } }, data: { reserved: 0 } });
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { merchantId } });
  await prisma.merchant.delete({ where: { id: merchantId } });
  await prisma.$disconnect();
});

describe("live orders, expiry, and claim flow", () => {
  it("creates a DRAFT order from comment, disambiguates variant 42, and sets draftExpiresAt", async () => {
    const res = await createLiveOrder({
      merchantId,
      liveSessionId,
      msgId: `m1-${tag}`,
      uniqueId: "@Amira_DZ",
      nickname: "Amira",
      rawComment: "كود 1 42",
      intent: { match: true, productCode: "P1", quantity: 1 },
    });

    expect(res).toMatchObject({ ok: true, productName: "Robe Satin", totalDzd: 3200, duplicate: false });
    if (!res.ok) return;

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: res.orderId },
      include: { items: true },
    });
    expect(order.status).toBe("DRAFT");
    expect(order.source).toBe("LIVE_COMMENT");
    expect(order.tiktokUsername).toBe("amira_dz");
    expect(order.draftExpiresAt).not.toBeNull();
    expect(order.items[0].variantId).toBe(variant42Id);

    const v42 = await prisma.variant.findUniqueOrThrow({ where: { id: variant42Id } });
    expect(v42.reserved).toBe(1);
  });

  it("blocks spammer from locking stock with repeated comments in same window", async () => {
    const a = await createLiveOrder({
      merchantId,
      liveSessionId,
      msgId: `spam1-${tag}`,
      uniqueId: "spammer",
      nickname: "Spam",
      rawComment: "P1 42",
      intent: { match: true, productCode: "P1", quantity: 1 },
    });
    const b = await createLiveOrder({
      merchantId,
      liveSessionId,
      msgId: `spam2-${tag}`,
      uniqueId: "spammer",
      nickname: "Spam",
      rawComment: "P1 42",
      intent: { match: true, productCode: "P1", quantity: 1 },
    });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(b.duplicate).toBe(true);
      expect(b.orderId).toBe(a.orderId);
    }
    const v42 = await prisma.variant.findUniqueOrThrow({ where: { id: variant42Id } });
    expect(v42.reserved).toBe(1);
  });

  it("expires unclaimed drafts and releases reserved stock", async () => {
    const res = await createLiveOrder({
      merchantId,
      liveSessionId,
      msgId: `exp-${tag}`,
      uniqueId: "ghost_buyer",
      nickname: "Ghost",
      rawComment: "P1 42 x2",
      intent: { match: true, productCode: "P1", quantity: 2 },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    await prisma.order.update({
      where: { id: res.orderId },
      data: { draftExpiresAt: new Date(Date.now() - 60_000) },
    });

    const n = await expireStaleLiveDrafts();
    expect(n).toBeGreaterThanOrEqual(1);

    const row = await prisma.order.findUniqueOrThrow({ where: { id: res.orderId } });
    expect(row.status).toBe("EXPIRED");
    expect((await prisma.variant.findUniqueOrThrow({ where: { id: variant42Id } })).reserved).toBe(0);
  });

  it("lets buyer claim DRAFT via /l/{token}, applies delivery rate & new wilaya mapping", async () => {
    const res = await createLiveOrder({
      merchantId,
      liveSessionId,
      msgId: `claim-${tag}`,
      uniqueId: "sara_99",
      nickname: "Sara",
      rawComment: "P1 42",
      intent: { match: true, productCode: "P1", quantity: 1 },
    });
    expect(res.ok).toBe(true);

    const claimable = await findClaimableOrders(merchantId, "@Sara_99");
    expect(claimable).toHaveLength(1);

    const claimed = await claimLiveOrders({
      sessionToken,
      tiktokHandle: "@Sara_99",
      customerName: "Sara Khelifi",
      phone: "0550123456",
      officialRegionKey: "n-barika",
      wilayaCode: 5,
      commune: "Barika",
      deliveryType: "HOME",
      address: "Rue de la Gare, Barika",
      messagingConsent: true,
    });

    expect(claimed).toMatchObject({
      ok: true,
      claimedCount: 1,
      productsTotalDzd: 3200,
      shippingFeeDzd: 700,
      grandTotalDzd: 3900,
    });

    const row = await prisma.order.findFirstOrThrow({ where: { merchantId } });
    expect(row.status).toBe("PENDING_CONFIRMATION");
    expect(row.wilayaCode).toBe(5);
    expect(row.officialRegionKey).toBe("n-barika");
    expect(row.shippingFeeDzd).toBe(700);
    expect(row.draftExpiresAt).toBeNull();
  });
});
