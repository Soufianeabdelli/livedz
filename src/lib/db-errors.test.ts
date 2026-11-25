import { describe, it, expect } from "vitest";
import { isStockCheckViolation } from "./db-errors";

describe("isStockCheckViolation", () => {
  it("detects a raw Postgres check_violation (23514)", () => {
    expect(isStockCheckViolation({ code: "23514", message: "boom" })).toBe(true);
  });

  it("detects a stock constraint name in the message", () => {
    const err = new Error('new row for relation "Variant" violates check constraint "variant_reserved_le_stock"');
    expect(isStockCheckViolation(err)).toBe(true);
  });

  it("detects Prisma P2004 with the constraint in meta", () => {
    const err = { code: "P2004", message: "constraint failed", meta: { constraint: "variant_stock_nonneg" } };
    expect(isStockCheckViolation(err)).toBe(true);
  });

  it("finds the violation inside a nested cause", () => {
    const inner = Object.assign(new Error("inner"), { code: "23514" });
    const outer = new Error("outer", { cause: inner });
    expect(isStockCheckViolation(outer)).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isStockCheckViolation(new Error("connection lost"))).toBe(false);
    expect(isStockCheckViolation({ code: "23505", message: "unique violation" })).toBe(false);
    expect(isStockCheckViolation({ code: "P2002" })).toBe(false);
  });

  it("ignores a P2004 about a different constraint", () => {
    expect(isStockCheckViolation({ code: "P2004", meta: { constraint: "other_check" } })).toBe(false);
  });

  it("is safe on null, strings and circular causes", () => {
    expect(isStockCheckViolation(null)).toBe(false);
    expect(isStockCheckViolation("oops")).toBe(false);
    const a: { cause?: unknown } = {};
    a.cause = a;
    expect(isStockCheckViolation(a)).toBe(false);
  });
});