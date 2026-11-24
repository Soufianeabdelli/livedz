import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { recordCallAttempt } from "@/lib/call-confirm";
import { syncCourierOrderStatus } from "@/lib/courier-sync";
import { prisma } from "@/lib/db";
import { getBuyerReputation } from "@/lib/reputation";

const tag = randomBytes(4).toString("hex");
let merchantId = "";
let variantId = "";

beforeAll(async () => {
  merchantId = (await prisma.merchant.create({ data: { name: "COD Shop", slug: `cod-${tag}` } })).id;
  const p = await prisma.product.create({
    data: { merchantId, code: "C1", name: "Jacket", priceDzd: 6000 },
  });
  variantId = (await prisma.variant.create({
    data: { productId: p.id, size: "L", color: "Noir", stock: 10 },
  })).id;
});

beforeEach(async () => {
  await prisma.order.deleteMany({ where: { merchantId } });
  await prisma.buyerReputation.deleteMany({ where: { merchantId } });
  await prisma.variant.update({ where: { id: variantId }, data: { stock: 10, reserved: 2 } });
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { merchantId } });
  await prisma.merchant.delete({ where: { id: merchantId } });
  await prisma.$disconnect();
});

async function mkOrder(status: "PENDING_CONFIRMATION" | "SHIPPED", trackingNumber?: string) {
  return prisma.order.create({
    data: {
      merchantId,
      status,
      source: "QR_LINK",
      idempotencyKey: randomBytes(12).toString("hex"),
      customerName: "Karim",
      phone: "0550123456",
      wilayaCode: 16,
      commune: "Alger",
      deliveryType: "HOME",
      address: "10 Rue Didouche",
      totalDzd: 12000,
      trackingNumber: trackingNumber ?? null,
      items: { create: { variantId, productName: "Jacket", quantity: 2, unitPriceDzd: 6000 } },
    },
    select: { id: true },
  });
}

describe("Phone confirmation & COD courier lifecycle", () => {
  it("moves to AWAITING_CUSTOMER after 3 no-answer calls, and confirms on CONFIRMED", async () => {
    const o = await mkOrder("PENDING_CONFIRMATION");
    const r1 = await recordCallAttempt({ merchantId, orderId: o.id, outcome: "NO_ANSWER" });
    const r2 = await recordCallAttempt({ merchantId, orderId: o.id, outcome: "NO_ANSWER" });
    const r3 = await recordCallAttempt({ merchantId, orderId: o.id, outcome: "NO_ANSWER" });
    expect(r1).toEqual({ ok: true, callAttempts: 1, newStatus: "PENDING_CONFIRMATION" });
    expect(r2).toEqual({ ok: true, callAttempts: 2, newStatus: "PENDING_CONFIRMATION" });
    expect(r3).toEqual({ ok: true, callAttempts: 3, newStatus: "AWAITING_CUSTOMER" });

    const r4 = await recordCallAttempt({ merchantId, orderId: o.id, outcome: "CONFIRMED" });
    expect(r4).toEqual({ ok: true, callAttempts: 4, newStatus: "CONFIRMED" });
    expect(await prisma.callLog.count({ where: { orderId: o.id } })).toBe(4);
  });

  it("releases reserved stock when call outcome is CANCELLED", async () => {
    const o = await mkOrder("PENDING_CONFIRMATION");
    const r = await recordCallAttempt({ merchantId, orderId: o.id, outcome: "CANCELLED" });
    expect(r).toEqual({ ok: true, callAttempts: 1, newStatus: "CANCELLED" });
    expect((await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).reserved).toBe(0);
  });

  it("syncs DELIVERED -> CASH_COLLECTED and updates buyer reputation", async () => {
    const trk = `TRK-OK-${tag}`;
    const o = await mkOrder("SHIPPED", trk);

    expect(await syncCourierOrderStatus({ trackingNumber: trk, courierStatus: "out_for_delivery" })).toEqual({
      ok: true,
      orderId: o.id,
      status: "OUT_FOR_DELIVERY",
    });
    expect(await syncCourierOrderStatus({ trackingNumber: trk, courierStatus: "livré" })).toEqual({
      ok: true,
      orderId: o.id,
      status: "DELIVERED",
    });
    expect(await syncCourierOrderStatus({ trackingNumber: trk, courierStatus: "cash_collected" })).toEqual({
      ok: true,
      orderId: o.id,
      status: "CASH_COLLECTED",
    });

    const rep = await getBuyerReputation(merchantId, "0550123456");
    expect(rep?.deliveredCount).toBe(1);
    expect(rep?.risk).toBe("none");
  });

  it("returns stock to inventory and flags buyer reputation on RETURNED", async () => {
    await prisma.variant.update({ where: { id: variantId }, data: { stock: 8, reserved: 0 } });
    const trk = `TRK-RET-${tag}`;
    const o = await mkOrder("SHIPPED", trk);

    const res = await syncCourierOrderStatus({ trackingNumber: trk, courierStatus: "retour" });
    expect(res).toEqual({ ok: true, orderId: o.id, status: "RETURNED" });

    const v = await prisma.variant.findUniqueOrThrow({ where: { id: variantId } });
    expect(v.stock).toBe(10); // +2 returned to shelf

    const rep = await getBuyerReputation(merchantId, "0550123456");
    expect(rep?.returnedCount).toBe(1);
    expect(rep?.risk).toBe("medium");
  });
});
