import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/couriers/dzship", () => ({ createParcel: vi.fn() }));

import { createParcel } from "@/lib/couriers/dzship";
import { prisma } from "@/lib/db";
import { shipOrder } from "@/lib/shipping";

const mocked = vi.mocked(createParcel);
const tag = randomBytes(4).toString("hex");
let a = "", b = "", variantId = "";

const mkOrder = (merchantId: string, status: "DRAFT" | "CONFIRMED" = "CONFIRMED", phone: string | null = "0550123456") =>
  prisma.order.create({
    data: {
      merchantId, status, source: "MANUAL", idempotencyKey: randomBytes(12).toString("hex"),
      customerName: "Test Buyer", phone, wilayaCode: 31, commune: "Oran",
      deliveryType: "HOME", address: "12 rue test", totalDzd: 9000,
      items: { create: { variantId, productName: "Test shoe", quantity: 2, unitPriceDzd: 4500 } },
    },
    select: { id: true },
  });
const stock = async () => {
  const v = await prisma.variant.findUniqueOrThrow({ where: { id: variantId } });
  return { stock: v.stock, reserved: v.reserved };
};
const order = (id: string) => prisma.order.findUniqueOrThrow({ where: { id } });
const okParcel = { ok: true as const, trackingNumber: "DZTEST-1", status: "created" };

beforeAll(async () => {
  a = (await prisma.merchant.create({ data: { name: "A", slug: `sa-${tag}` } })).id;
  b = (await prisma.merchant.create({ data: { name: "B", slug: `sb-${tag}` } })).id;
  const p = await prisma.product.create({ data: { merchantId: a, code: "01", name: "Test shoe", priceDzd: 4500 } });
  variantId = (await prisma.variant.create({ data: { productId: p.id, size: "42", color: "Black", stock: 10 } })).id;
});
beforeEach(async () => {
  mocked.mockReset();
  await prisma.order.deleteMany({ where: { merchantId: { in: [a, b] } } });
  await prisma.variant.update({ where: { id: variantId }, data: { stock: 10, reserved: 2 } });
});
afterAll(async () => {
  await prisma.order.deleteMany({ where: { merchantId: { in: [a, b] } } });
  await prisma.merchant.deleteMany({ where: { id: { in: [a, b] } } });
  await prisma.$disconnect();
});

describe("shipOrder success", () => {
  it("ships a confirmed order, saves tracking, moves stock out", async () => {
    mocked.mockResolvedValue(okParcel);
    const o = await mkOrder(a);
    expect(await shipOrder(a, o.id, "sandbox")).toEqual({ ok: true, trackingNumber: "DZTEST-1" });
    const row = await order(o.id);
    expect(row.status).toBe("SHIPPED");
    expect(row.trackingNumber).toBe("DZTEST-1");
    expect(row.courier).toBe("sandbox");
    expect(await stock()).toEqual({ stock: 8, reserved: 0 });
  });

  it("sends the right data to the courier", async () => {
    mocked.mockResolvedValue(okParcel);
    const o = await mkOrder(a);
    await shipOrder(a, o.id, "sandbox");
    expect(mocked).toHaveBeenCalledTimes(1);
    const sent = mocked.mock.calls[0][1];
    expect(sent).toMatchObject({ codAmount: 9000, deliveryType: "home", wilayaCode: 31, communeName: "Oran", reference: o.id });
    expect(sent.productList).toContain("Test shoe 42 Black x2");
  });

  it("a double click sends only one parcel", async () => {
    mocked.mockImplementation(async () => { await new Promise((r) => setTimeout(r, 50)); return okParcel; });
    const o = await mkOrder(a);
    const rs = await Promise.all([shipOrder(a, o.id, "sandbox"), shipOrder(a, o.id, "sandbox")]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(await stock()).toEqual({ stock: 8, reserved: 0 });
  });
});
describe("shipOrder failures", () => {
  it("courier rejection puts the order back to CONFIRMED and keeps stock", async () => {
    mocked.mockResolvedValue({ ok: false, error: "invalid_input", fields: ["commune"], detail: "x", status: 400 });
    const o = await mkOrder(a);
    expect(await shipOrder(a, o.id, "sandbox")).toEqual({ ok: false, error: "courier_rejected", fields: ["commune"] });
    const row = await order(o.id);
    expect(row.status).toBe("CONFIRMED");
    expect(row.courier).toBeNull();
    expect(await stock()).toEqual({ stock: 10, reserved: 2 });
  });

  it("a network error is reported as courier_unavailable", async () => {
    mocked.mockResolvedValue({ ok: false, error: "network_error", fields: [], detail: "network_error" });
    const o = await mkOrder(a);
    expect((await shipOrder(a, o.id, "sandbox")).ok).toBe(false);
    expect((await order(o.id)).status).toBe("CONFIRMED");
  });

  it("refuses an order that is not confirmed", async () => {
    const o = await mkOrder(a, "DRAFT");
    expect(await shipOrder(a, o.id, "sandbox")).toEqual({ ok: false, error: "not_confirmed" });
    expect(mocked).not.toHaveBeenCalled();
  });

  it("another merchant cannot ship my order", async () => {
    const o = await mkOrder(a);
    expect(await shipOrder(b, o.id, "sandbox")).toEqual({ ok: false, error: "not_found" });
    expect(mocked).not.toHaveBeenCalled();
    expect((await order(o.id)).status).toBe("CONFIRMED");
  });

  it("reports missing data before calling the courier", async () => {
    const o = await mkOrder(a, "CONFIRMED", null);
    const r = await shipOrder(a, o.id, "sandbox");
    expect(r.ok === false && r.error).toBe("missing_data");
    expect(r.ok === false && r.fields).toContain("phone");
    expect(mocked).not.toHaveBeenCalled();
  });

  it("a real courier without saved keys is refused", async () => {
    const o = await mkOrder(a);
    expect(await shipOrder(a, o.id, "yalidine")).toEqual({ ok: false, error: "no_courier_account" });
    expect(mocked).not.toHaveBeenCalled();
  });
});