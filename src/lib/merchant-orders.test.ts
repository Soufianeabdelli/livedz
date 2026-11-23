import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { changeOrderStatus, listOrders } from "@/lib/merchant-orders";

const tag = randomBytes(4).toString("hex");
let a = "", b = "", variantId = "";

const mkOrder = (merchantId: string, withItem: boolean) =>
  prisma.order.create({
    data: {
      merchantId, status: "DRAFT", source: "MANUAL",
      idempotencyKey: randomBytes(12).toString("hex"),
      customerName: "Test", phone: "0550123456", totalDzd: 9000,
      ...(withItem
        ? { items: { create: { variantId, productName: "Test shoe", quantity: 2, unitPriceDzd: 4500 } } }
        : {}),
    },
    select: { id: true },
  });
const setReserved = (n: number) => prisma.variant.update({ where: { id: variantId }, data: { reserved: n } });
const reserved = async () => (await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).reserved;
const status = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

beforeAll(async () => {
  a = (await prisma.merchant.create({ data: { name: "A", slug: `ta-${tag}` } })).id;
  b = (await prisma.merchant.create({ data: { name: "B", slug: `tb-${tag}` } })).id;
  const p = await prisma.product.create({ data: { merchantId: a, code: "01", name: "Test shoe", priceDzd: 4500 } });
  variantId = (await prisma.variant.create({ data: { productId: p.id, size: "42", color: "Black", stock: 10 } })).id;
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { merchantId: { in: [a, b] } } });
  await prisma.merchant.deleteMany({ where: { id: { in: [a, b] } } });
  await prisma.$disconnect();
});

describe("merchant orders", () => {
  it("lists only the merchant's own orders", async () => {
    const oa = await mkOrder(a, true);
    const ob = await mkOrder(b, false);
    const la = (await listOrders(a)).map((o) => o.id);
    const lb = (await listOrders(b)).map((o) => o.id);
    expect(la).toContain(oa.id);
    expect(la).not.toContain(ob.id);
    expect(lb).toContain(ob.id);
    expect(lb).not.toContain(oa.id);
  });

  it("another merchant cannot change my order", async () => {
    const o = await mkOrder(a, true);
    expect(await changeOrderStatus(b, o.id, "CANCELLED")).toEqual({ ok: false, error: "not_found" });
    expect(await changeOrderStatus(b, o.id, "CONFIRMED")).toEqual({ ok: false, error: "not_found" });
    expect(await status(o.id)).toBe("DRAFT");
  });

  it("confirm keeps the stock reserved, cancel releases it", async () => {
    await setReserved(2);
    const o = await mkOrder(a, true);
    expect(await changeOrderStatus(a, o.id, "CONFIRMED")).toEqual({ ok: true });
    expect(await reserved()).toBe(2);
    expect(await changeOrderStatus(a, o.id, "CANCELLED")).toEqual({ ok: true });
    expect(await reserved()).toBe(0);
  });

  it("parallel cancels release the stock only once", async () => {
    await setReserved(4);
    const o = await mkOrder(a, true);
    const rs = await Promise.all([1, 2, 3].map(() => changeOrderStatus(a, o.id, "CANCELLED")));
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect(await reserved()).toBe(2);
  });

  it("a cancelled order cannot be confirmed", async () => {
    const o = await mkOrder(a, false);
    await changeOrderStatus(a, o.id, "CANCELLED");
    expect(await changeOrderStatus(a, o.id, "CONFIRMED")).toEqual({ ok: false, error: "invalid_transition" });
  });

  it("an unknown order id is not found", async () => {
    expect(await changeOrderStatus(a, "does-not-exist", "CONFIRMED")).toEqual({ ok: false, error: "not_found" });
  });
});