import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { deleteCourierAccount, listCourierAccounts, loadCredentials, saveCourierAccount } from "@/lib/courier-accounts";

const tag = randomBytes(4).toString("hex");
let a = "", b = "";

beforeAll(async () => {
  a = (await prisma.merchant.create({ data: { name: "A", slug: `ca-${tag}` } })).id;
  b = (await prisma.merchant.create({ data: { name: "B", slug: `cb-${tag}` } })).id;
});
afterAll(async () => {
  await prisma.merchant.deleteMany({ where: { id: { in: [a, b] } } });
  await prisma.$disconnect();
});

const vals = { apiId: "ID-12345", apiToken: "SECRET-TOKEN-abcd" };

describe("courier accounts", () => {
  it("stores encrypted, never plain text", async () => {
    expect(await saveCourierAccount(a, "yalidine", vals, 16)).toEqual({ ok: true });
    const row = await prisma.courierAccount.findFirstOrThrow({ where: { merchantId: a } });
    expect(row.credentialsEnc).not.toContain("SECRET-TOKEN");
    expect(row.credentialsEnc.startsWith("v1.")).toBe(true);
    expect(row.hint).toBe("****abcd");
  });

  it("the list never exposes credentials", async () => {
    const list = await listCourierAccounts(a);
    expect(list).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain("SECRET-TOKEN");
    expect(Object.keys(list[0])).not.toContain("credentialsEnc");
  });

  it("loads the full credentials on the server", async () => {
    const c = await loadCredentials(a, "yalidine");
    expect(c?.credentials).toEqual(vals);
    expect(c?.fromWilaya).toBe(16);
  });

  it("another merchant has no access to my account", async () => {
    expect(await listCourierAccounts(b)).toHaveLength(0);
    expect(await loadCredentials(b, "yalidine")).toBeNull();
  });

  it("a ciphertext copied to another merchant cannot be read", async () => {
    const row = await prisma.courierAccount.findFirstOrThrow({ where: { merchantId: a } });
    await prisma.courierAccount.create({
      data: { merchantId: b, courier: "yalidine", credentialsEnc: row.credentialsEnc, hint: row.hint, fromWilaya: 16 },
    });
    await expect(loadCredentials(b, "yalidine")).rejects.toThrow();
    await deleteCourierAccount(b, "yalidine");
  });

  it("saving again replaces the old account", async () => {
    await saveCourierAccount(a, "yalidine", { apiId: "ID-99999", apiToken: "NEW-TOKEN-wxyz" }, 16);
    expect(await prisma.courierAccount.count({ where: { merchantId: a } })).toBe(1);
    expect((await loadCredentials(a, "yalidine"))?.credentials.apiId).toBe("ID-99999");
  });

  it("rejects bad input", async () => {
    expect(await saveCourierAccount(a, "nope", vals, 16)).toEqual({ ok: false, error: "unknown_courier" });
    expect(await saveCourierAccount(a, "yalidine", { apiId: "", apiToken: "x" }, 16)).toEqual({ ok: false, error: "missing_field" });
    expect(await saveCourierAccount(a, "yalidine", vals, 99)).toEqual({ ok: false, error: "bad_wilaya" });
  });

  it("sandbox needs no credentials", async () => {
    expect(await saveCourierAccount(a, "sandbox", {}, 0)).toEqual({ ok: true });
  });
});