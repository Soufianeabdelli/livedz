import { describe, expect, it } from "vitest";
import { compareSizes, groupVariants, resolveVariant } from "./variant-groups";

describe("compareSizes", () => {
  it("sorts numbers numerically", () => {
    expect(["10", "9", "38", "40"].sort(compareSizes)).toEqual(["9", "10", "38", "40"]);
  });

  it("sorts clothing letters by size and puts numbers first", () => {
    expect(["XL", "S", "L", "M"].sort(compareSizes)).toEqual(["S", "M", "L", "XL"]);
    expect(["M", "40", "S"].sort(compareSizes)).toEqual(["40", "S", "M"]);
  });
});

describe("groupVariants", () => {
  const shoes = [
    { id: "a", size: "41", color: "Black", available: 2 },
    { id: "b", size: "40", color: "Black", available: 8 },
    { id: "c", size: "40", color: "White", available: 0 },
  ];

  it("groups by color and sorts sizes inside each color", () => {
    const g = groupVariants(shoes);
    expect(g.hasColor).toBe(true);
    expect(g.hasSize).toBe(true);
    expect(g.colors.map((c) => c.color)).toEqual(["Black", "White"]);
    expect(g.colors[0].sizes.map((s) => s.size)).toEqual(["40", "41"]);
    expect(g.colors[0].available).toBe(10);
    expect(g.colors[1].available).toBe(0);
  });

  it("never reports negative stock", () => {
    const g = groupVariants([{ id: "x", size: "S", color: "", available: -3 }]);
    expect(g.colors[0].sizes[0].available).toBe(0);
  });

  it("a product without size or color has one variant and no picker", () => {
    const g = groupVariants([{ id: "only", size: "", color: "", available: 5 }]);
    expect(g.hasColor).toBe(false);
    expect(g.hasSize).toBe(false);
    expect(resolveVariant(g.colors, "", "")?.id).toBe("only");
  });
});

describe("resolveVariant", () => {
  const g = groupVariants([
    { id: "a", size: "40", color: "Black", available: 3 },
    { id: "b", size: "41", color: "Black", available: 1 },
  ]);

  it("finds the variant for a color and size", () => {
    expect(resolveVariant(g.colors, "Black", "41")?.id).toBe("b");
  });

  it("returns null for an unknown color or size", () => {
    expect(resolveVariant(g.colors, "Red", "41")).toBeNull();
    expect(resolveVariant(g.colors, "Black", "50")).toBeNull();
  });
});