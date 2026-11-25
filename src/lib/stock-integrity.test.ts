import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { isStockCheckViolation } from "./db-errors";

const tag = `sit${Date.now().toString(36)}`;
let merchantId = "";
let productId = "";
let n = 0;

async function makeVariant(stock: number, reserved = 0): Promise<string> {
  const v = await prisma.variant.create({
    data: { productId, size: `S${n++}`, stock, reserved },
  });
  return v.id;
}

async function read(id: string) {
  return prisma.variant.findUniqueOrThrow({
    where: { id },
    select: { stock: true, reserved: true },
  });
}

async function failure(p: PromiseLike<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  return undefined;
}

function describeErr(err: unknown): string {
  const e = err as { code?: unknown; message?: unknown; cause?: { code?: unknown } } | undefined;
  return `code=${String(e?.code)} cause.code=${String(e?.cause?.code)} message=${String(e?.message).slice(0, 300)}`;
}

const reserveOne = (id: string) =>
  prisma.$executeRaw`UPDATE "Variant" SET "reserved" = "reserved" + 1
                     WHERE "id" = ${id} AND "stock" - "reserved" >= 1`;

describe("stock integrity (real database)", () => {
  beforeAll(async () => {
    const m = await prisma.merchant.create({
      data: {
        name: tag,
        slug: tag,
        products: { create: { code: "SIT1", name: tag, priceDzd: 100 } },
      },
      select: { id: true, products: { select: { id: true } } },
    });
    merchantId = m.id;
    productId = m.products[0].id;
  });

  afterAll(async () => {
    if (merchantId) await prisma.merchant.delete({ where: { id: merchantId } });
  });

  it("10 parallel reservations on 3 units succeed exactly 3 times", async () => {
    const id = await makeVariant(3);
    const results = await Promise.all(Array.from({ length: 10 }, () => reserveOne(id)));
    expect(results.reduce((a, b) => a + b, 0)).toBe(3);
    expect(await read(id)).toEqual({ stock: 3, reserved: 3 });
  });

  it("database rejects reserved > stock and leaves the row unchanged", async () => {
    const id = await makeVariant(5);
    const err = await failure(prisma.variant.update({ where: { id }, data: { reserved: 6 } }));
    expect(err).toBeDefined();
    expect(isStockCheckViolation(err), describeErr(err)).toBe(true);
    expect(await read(id)).toEqual({ stock: 5, reserved: 0 });
  });

  it("database rejects negative stock", async () => {
    const id = await makeVariant(5);
    const err = await failure(prisma.variant.update({ where: { id }, data: { stock: -1 } }));
    expect(isStockCheckViolation(err), describeErr(err)).toBe(true);
  });

  it("database rejects negative reserved", async () => {
    const id = await makeVariant(5);
    const err = await failure(prisma.variant.update({ where: { id }, data: { reserved: -1 } }));
    expect(isStockCheckViolation(err), describeErr(err)).toBe(true);
  });

  it("ship commit as ONE statement keeps the invariant", async () => {
    const id = await makeVariant(3, 3);
    await prisma.$executeRaw`UPDATE "Variant" SET "stock" = "stock" - 3, "reserved" = "reserved" - 3 WHERE "id" = ${id}`;
    expect(await read(id)).toEqual({ stock: 0, reserved: 0 });
  });

  it("ship commit as TWO statements fails (why it must stay one UPDATE)", async () => {
    const id = await makeVariant(3, 3);
    const err = await failure(
      prisma.$executeRaw`UPDATE "Variant" SET "stock" = "stock" - 3 WHERE "id" = ${id}`,
    );
    expect(isStockCheckViolation(err), describeErr(err)).toBe(true);
    expect(await read(id)).toEqual({ stock: 3, reserved: 3 });
  });
});