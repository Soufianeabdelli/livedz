import { describe, expect, it } from "vitest";
import { COURIERS, getCourier, searchCouriers } from "./registry";

describe("courier registry", () => {
  it("starts with sandbox, which needs no credentials", () => {
    expect(COURIERS[0].key).toBe("sandbox");
    expect(COURIERS[0].fields).toHaveLength(0);
  });

  it("has many couriers with unique, well formed keys", () => {
    const keys = COURIERS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((k) => /^[a-z0-9]{2,40}$/.test(k))).toBe(true);
    expect(COURIERS.length).toBeGreaterThan(50);
  });

  it("every real courier asks for at least one well formed field", () => {
    for (const c of COURIERS.slice(1)) {
      expect(c.fields.length).toBeGreaterThan(0);
      expect(c.fields.every((f) => /^[A-Za-z][A-Za-z0-9]{1,30}$/.test(f.key))).toBe(true);
    }
  });

  it("treats yalidine apiId as visible and apiToken as secret", () => {
    const y = getCourier("yalidine");
    expect(y?.needsFromWilaya).toBe(true);
    expect(y?.fields.find((f) => f.key === "apiId")?.secret).toBe(false);
    expect(y?.fields.find((f) => f.key === "apiToken")?.secret).toBe(true);
  });

  it("never shows a token, key or password as plain text", () => {
    for (const c of COURIERS) {
      for (const f of c.fields) {
        if (/token|secret|key|password/i.test(f.key)) expect(f.secret).toBe(true);
      }
    }
  });

  it("puts the popular couriers first, right after sandbox", () => {
    const keys = COURIERS.slice(1, 5).map((c) => c.key);
    expect(keys).toContain("yalidine");
    expect(keys).toContain("zrexpress");
  });

  it("search finds by name, key and alias, ignoring case", () => {
    expect(searchCouriers("YALID").some((c) => c.key === "yalidine")).toBe(true);
    expect(searchCouriers("procolis").some((c) => c.key === "zrexpress")).toBe(true);
    expect(searchCouriers("zzzz-nothing")).toHaveLength(0);
    expect(searchCouriers("")).toHaveLength(COURIERS.length);
  });

  it("only yalidine family platforms ask for a departure wilaya", () => {
    const wanting = COURIERS.filter((c) => c.needsFromWilaya).map((c) => c.key);
    expect(wanting).toContain("yalidine");
    expect(getCourier("sandbox")?.needsFromWilaya).toBe(false);
  });
});