import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getMerchantContext } from "@/lib/merchant";

const uid = `test-uid-${randomBytes(4).toString("hex")}`;
const user = { uid, email: "Test.Owner@example.com" };
let merchantId = "";

afterAll(async () => {
  if (merchantId) await prisma.merchant.delete({ where: { id: merchantId } });
  await prisma.$disconnect();
});

describe("getMerchantContext", () => {
  it("creates exactly one merchant for parallel first visits", async () => {
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => getMerchantContext(user)));
    merchantId = rs[0].merchantId;
    expect(new Set(rs.map((r) => r.merchantId)).size).toBe(1);
    expect(rs[0].role).toBe("OWNER");
    expect(await prisma.membership.count({ where: { userId: uid } })).toBe(1);
  });

  it("returns the same merchant on the next visit", async () => {
    const again = await getMerchantContext(user);
    expect(again.merchantId).toBe(merchantId);
  });
});