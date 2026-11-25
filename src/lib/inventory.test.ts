import { describe, it, expect } from "vitest";
import { buildSku, computeAvailability } from "./inventory";

const row = (sku: string, onHand: number, reserved: number) => ({
  variantId: `v-${sku}`,
  sku,
  onHand,
  reserved,
});

describe("computeAvailability", () => {
  it("subtracts reserved units from on-hand stock", () => {
    const { items } = computeAvailability([{ variantId: "v1", sku: "TEE-M", onHand: 10, reserved: 3 }]);
    expect(items).toEqual([
      { variantId: "v1", sku: "TEE-M", onHand: 10, reserved: 3, available: 7 },
    ]);
  });

  it("clamps available at 0 when reserved exceeds on-hand", () => {
    const { items } = computeAvailability([row("A", 2, 5)]);
    expect(items[0].available).toBe(0);
  });

  it("returns 0 when fully reserved", () => {
    const { items } = computeAvailability([row("A", 4, 4)]);
    expect(items[0].available).toBe(0);
  });

  it("returns an empty array for empty input", () => {
    const { items } = computeAvailability([]);
    expect(items).toEqual([]);
  });

  it("preserves input order", () => {
    const { items } = computeAvailability([row("C", 1, 0), row("A", 5, 1), row("B", 3, 3)]);
    expect(items.map((r) => r.sku)).toEqual(["C", "A", "B"]);
  });

  it("does not mutate the input rows", () => {
    const input = [row("A", 10, 3)];
    computeAvailability(input);
    expect(input[0]).not.toHaveProperty("available");
  });

  it.each([
    ["negative onHand", row("X", -1, 0)],
    ["negative reserved", row("X", 5, -2)],
    ["fractional onHand", row("X", 1.5, 0)],
    ["fractional reserved", row("X", 5, 0.5)],
    ["NaN onHand", row("X", Number.NaN, 0)],
    ["Infinity reserved", row("X", 5, Number.POSITIVE_INFINITY)],
  ])("throws RangeError on %s", (_label, bad) => {
    expect(() => computeAvailability([bad])).toThrow(RangeError);
  });

  it("names the offending SKU in the error", () => {
    expect(() => computeAvailability([row("TEE-XL", -1, 0)])).toThrow(/TEE-XL/);
  });

  it("returns no warnings when reserved <= onHand", () => {
    const { warnings } = computeAvailability([row("A", 10, 3)]);
    expect(warnings).toEqual([]);
  });

  it("returns an oversell warning when reserved exceeds onHand", () => {
    const { warnings } = computeAvailability([row("A", 2, 5)]);
    expect(warnings).toEqual([{ sku: "A", onHand: 2, reserved: 5, deficit: 3 }]);
  });

  it("collects multiple warnings", () => {
    const { warnings } = computeAvailability([row("A", 2, 5), row("B", 1, 4), row("C", 10, 3)]);
    expect(warnings).toHaveLength(2);
    expect(warnings.map((w) => w.sku)).toEqual(["A", "B"]);
  });
});

describe("buildSku", () => {
  it("constructs sku from code, size, color", () => {
    expect(buildSku("K1", "M", "RED")).toBe("K1-M-RED");
  });

  it("uses STD for missing size or color", () => {
    expect(buildSku("K1", null, null)).toBe("K1-STD-STD");
    expect(buildSku("K1", "", "")).toBe("K1-STD-STD");
    expect(buildSku("K1", "L", null)).toBe("K1-L-STD");
  });
});