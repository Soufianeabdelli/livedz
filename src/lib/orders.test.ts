import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createOrder } from "@/lib/orders";
import type { OrderInput } from "@/lib/order-input";

const slug = `test-${randomBytes(4).toString("hex")}`;
const token = randomBytes(16).toString("base64url");
let merchantId = "", variantId = "", otherVariantId = "";

const key = () => randomBytes(12).toString("hex");
const input = (over: Partial<OrderInput> = {}): OrderInput => ({
  token, idempotencyKey: key(), variantId, quantity: 1,
  customerName: "Test Buyer", phone: "0550123456", wilayaCode: 31,
  commune: "Oran", deliveryType: "STOPDESK", messagingConsent: false, ...over,
});
const reserved = async () =>
  (await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).reserved;
const orderCount = () => prisma.order.count({ where: { merchantId } });

beforeAll(async () => {
  merchantId = (await prisma.merchant.create({ data: { name: "Test", slug } })).id;
  const p = await prisma.product.create({
    data: { merchantId, code: "01", name: "Test shoe", priceDzd: 4500 },
  });
  variantId = (await prisma.variant.create({
    data: { productId: p.id, size: "42", color: "Black", stock: 2 },
  })).id;
  const p2 = await prisma.product.create({
    data: { merchantId, code: "02", name: "Other", priceDzd: 1000 },
  });
  otherVariantId = (await prisma.variant.create({
    data: { productId: p2.id, size: "40", stock: 5 },
  })).id;
  await prisma.card.create({ data: { token, merchantId, productId: p.id } });
});

beforeEach(async () => {
  await prisma.order.deleteMany({ where: { merchantId } });
  await prisma.variant.update({ where: { id: variantId }, data: { reserved: 0 } });
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { merchantId } });
  await prisma.merchant.delete({ where: { id: merchantId } });
  await prisma.$disconnect();
});

describe("createOrder", () => {
  it("saves a draft order, takes the price from the DB, reserves stock", async () => {
    const r = await createOrder(input({ quantity: 2 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalDzd).toBe(9000);
    expect(await reserved()).toBe(2);
    const o = await prisma.order.findUniqueOrThrow({
      where: { id: r.orderId }, include: { items: true },
    });
    expect(o.status).toBe("DRAFT");
    expect(o.items[0].unitPriceDzd).toBe(4500);
  });

  it("returns the same order for a repeated idempotency key", async () => {
    const i = input();
    const a = await createOrder(i);
    const b = await createOrder(i);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(b.duplicate).toBe(true);
      expect(b.orderId).toBe(a.orderId);
    }
    expect(await orderCount()).toBe(1);
    expect(await reserved()).toBe(1);
  });

  it("creates one order when the same key arrives in parallel", async () => {
    const i = input();
    const rs = await Promise.all([createOrder(i), createOrder(i), createOrder(i)]);
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(await orderCount()).toBe(1);
    expect(await reserved()).toBe(1);
  });

  it("never oversells: 5 parallel orders, stock for 2", async () => {
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => createOrder(input())));
    expect(rs.filter((r) => r.ok)).toHaveLength(2);
    expect(rs.filter((r) => !r.ok)).toHaveLength(3);
    expect(await reserved()).toBe(2);
    expect(await orderCount()).toBe(2);
  });

  it("rejects a quantity above the available stock", async () => {
    const r = await createOrder(input({ quantity: 3 }));
    expect(r).toEqual({ ok: false, error: "out_of_stock" });
    expect(await reserved()).toBe(0);
  });

  it("rejects an unknown card token", async () => {
    const r = await createOrder(input({ token: randomBytes(16).toString("base64url") }));
    expect(r).toEqual({ ok: false, error: "card_not_found" });
  });

  it("rejects a variant that belongs to another product", async () => {
    const r = await createOrder(input({ variantId: otherVariantId }));
    expect(r).toEqual({ ok: false, error: "variant_not_found" });
  });
});