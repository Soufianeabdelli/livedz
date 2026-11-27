import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDeliveryQuote } from "./delivery-quote";

const tag = "dq-" + Date.now();
let merchantId = "";

beforeAll(async () => {
  merchantId = (await prisma.merchant.create({ data: { name: "DQ", slug: tag } })).id;
  await prisma.deliveryRate.create({ data: { merchantId, wilayaCode: 16, homeDzd: 600, stopdeskDzd: 400 } });
  await prisma.deliveryRate.create({ data: { merchantId, wilayaCode: 31, homeDzd: 0, stopdeskDzd: 0 } });
});

afterAll(async () => {
  await prisma.merchant.delete({ where: { id: merchantId } });
  await prisma.$disconnect();
});

describe("getDeliveryQuote", () => {
  it("returns the seller prices when they are set", async () => {
    expect(await getDeliveryQuote(merchantId, 16)).toEqual({ homeDzd: 600, stopdeskDzd: 400 });
  });

  it("returns null when the seller never set a price (not free)", async () => {
    expect(await getDeliveryQuote(merchantId, 5)).toBeNull();
  });

  it("a saved 0 is a real price: free delivery on purpose", async () => {
    expect(await getDeliveryQuote(merchantId, 31)).toEqual({ homeDzd: 0, stopdeskDzd: 0 });
  });

  it("another merchant never sees these prices", async () => {
    expect(await getDeliveryQuote("other-merchant-id", 16)).toBeNull();
  });

  it("rejects courier codes outside 1..58", async () => {
    expect(await getDeliveryQuote(merchantId, 0)).toBeNull();
    expect(await getDeliveryQuote(merchantId, 59)).toBeNull();
    expect(await getDeliveryQuote(merchantId, 1.5)).toBeNull();
  });
});