import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  getOverlayStateBySlug,
  updateActiveCardForMerchant,
  updateOverlayHiddenForMerchant,
} from "./overlay-state";

const suffix = randomBytes(4).toString("hex");
let m1 = "";
let m2 = "";
let m1Slug = "";
let m1CardId = "";
let m2CardId = "";

beforeAll(async () => {
  m1Slug = `m1-${suffix}`;
  const mer1 = await prisma.merchant.create({ data: { name: "Store 1", slug: m1Slug } });
  const mer2 = await prisma.merchant.create({ data: { name: "Store 2", slug: `m2-${suffix}` } });
  m1 = mer1.id;
  m2 = mer2.id;

  const p1 = await prisma.product.create({ data: { merchantId: m1, code: "01", name: "Item 1", priceDzd: 3000 } });
  const p2 = await prisma.product.create({ data: { merchantId: m2, code: "01", name: "Item 2", priceDzd: 4000 } });

  const c1 = await prisma.card.create({
    data: { token: randomBytes(12).toString("base64url"), merchantId: m1, productId: p1.id },
  });
  const c2 = await prisma.card.create({
    data: { token: randomBytes(12).toString("base64url"), merchantId: m2, productId: p2.id },
  });
  m1CardId = c1.id;
  m2CardId = c2.id;
});

afterAll(async () => {
  await prisma.merchant.deleteMany({ where: { id: { in: [m1, m2] } } });
  await prisma.$disconnect();
});

describe("overlay-state", () => {
  it("rejects setting a card that belongs to another merchant", async () => {
    const okOther = await updateActiveCardForMerchant(m1, m2CardId);
    expect(okOther).toBe(false);

    const okOwn = await updateActiveCardForMerchant(m1, m1CardId);
    expect(okOwn).toBe(true);

    const state = await getOverlayStateBySlug(m1Slug);
    expect(state?.activeCardId).toBe(m1CardId);
  });

  it("toggles overlayHidden cleanly and exposes only public state fields", async () => {
    await updateOverlayHiddenForMerchant(m1, true);
    const hiddenState = await getOverlayStateBySlug(m1Slug);
    expect(hiddenState).toEqual({
      activeCardId: m1CardId,
      overlayHidden: true,
      platform: "tiktok",
    });

    await updateOverlayHiddenForMerchant(m1, false);
    const shownState = await getOverlayStateBySlug(m1Slug);
    expect(shownState?.overlayHidden).toBe(false);
  });

  it("returns null for an unknown merchant slug", async () => {
    const missing = await getOverlayStateBySlug(`no-such-store-${suffix}`);
    expect(missing).toBeNull();
  });
});
