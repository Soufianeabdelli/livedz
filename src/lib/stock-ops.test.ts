import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { releaseReserved, commitReserved, restoreStock, StockInvariantError } from "./stock-ops";

const tag = `sop${Date.now().toString(36)}`;
let merchantId = "";
let productId = "";
let n = 0;

async function makeVariant(stock: number, reserved = 0): Promise<string> {
  const v = await prisma.variant.create({ data: { productId, size: `S${n++}`, stock, reserved } });
  return v.id;
}
const read = (id: string) =>
  prisma.variant.findUniqueOrThrow({ where: { id }, select: { stock: true, reserved: true } });

describe("stock-ops (real database)", () => {
  beforeAll(async () => {
    const m = await prisma.merchant.create({
      data: { name: tag, slug: tag, products: { create: { code: "SOP1", name: tag, priceDzd: 100 } } },
      select: { id: true, products: { select: { id: true } } },
    });
    merchantId = m.id;
    productId = m.products[0].id;
  });

  afterAll(async () => {
    if (merchantId) await prisma.merchant.delete({ where: { id: merchantId } });
  });

  it("releaseReserved gives reserved units back", async () => {
    const id = await makeVariant(5, 3);
    await prisma.$transaction((tx) => releaseReserved(tx, [{ variantId: id, quantity: 2 }]));
    expect(await read(id)).toEqual({ stock: 5, reserved: 1 });
  });

  it("releaseReserved throws and changes nothing when reserved < quantity", async () => {
    const id = await makeVariant(5, 1);
    await expect(
      prisma.$transaction((tx) => releaseReserved(tx, [{ variantId: id, quantity: 2 }])),
    ).rejects.toBeInstanceOf(StockInvariantError);
    expect(await read(id)).toEqual({ stock: 5, reserved: 1 });
  });

  it("commitReserved lowers stock and reserved together", async () => {
    const id = await makeVariant(5, 3);
    await prisma.$transaction((tx) => commitReserved(tx, [{ variantId: id, quantity: 3 }]));
    expect(await read(id)).toEqual({ stock: 2, reserved: 0 });
  });

  it("commitReserved throws and changes nothing when reserved < quantity", async () => {
    const id = await makeVariant(5, 1);
    await expect(
      prisma.$transaction((tx) => commitReserved(tx, [{ variantId: id, quantity: 2 }])),
    ).rejects.toBeInstanceOf(StockInvariantError);
    expect(await read(id)).toEqual({ stock: 5, reserved: 1 });
  });

  it("restoreStock adds returned units back to stock", async () => {
    const id = await makeVariant(5, 0);
    await prisma.$transaction((tx) => restoreStock(tx, [{ variantId: id, quantity: 2 }]));
    expect(await read(id)).toEqual({ stock: 7, reserved: 0 });
  });

  it("one failing item rolls back the whole transaction", async () => {
    const ok = await makeVariant(5, 2);
    const bad = await makeVariant(5, 0);
    await expect(
      prisma.$transaction((tx) =>
        releaseReserved(tx, [
          { variantId: ok, quantity: 2 },
          { variantId: bad, quantity: 1 },
        ]),
      ),
    ).rejects.toBeInstanceOf(StockInvariantError);
    expect(await read(ok)).toEqual({ stock: 5, reserved: 2 });
    expect(await read(bad)).toEqual({ stock: 5, reserved: 0 });
  });

  it("rejects zero, negative and fractional quantities before touching the database", async () => {
    const fake = { $executeRaw: async () => 1 };
    for (const q of [0, -1, 1.5]) {
      await expect(releaseReserved(fake, [{ variantId: "x", quantity: q }])).rejects.toThrow(RangeError);
    }
  });
});