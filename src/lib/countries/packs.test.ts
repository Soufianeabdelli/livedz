import { describe, it, expect } from "vitest";
import { getCountryPack, isRtl, formatMoney } from "./packs";

describe("country packs", () => {
  it("finds Algeria case-insensitively", () => {
    expect(getCountryPack("dz")?.currency).toBe("DZD");
  });

  it("returns undefined for an unknown country", () => {
    expect(getCountryPack("ZZ")).toBeUndefined();
  });

  it("treats Arabic as RTL and French as LTR", () => {
    const dz = getCountryPack("DZ")!;
    expect(isRtl(dz, "ar")).toBe(true);
    expect(isRtl(dz, "fr")).toBe(false);
  });

  it("formats DZD without decimals", () => {
    const dz = getCountryPack("DZ")!;
    const text = formatMoney(3500, dz, "fr").replace(/\s/g, " ");
    expect(text).toContain("3 500");
    expect(text).toMatch(/DA|DZD/);
    expect(text).not.toMatch(/[.,]\d{2}\b/);
  });

  it("rejects non-finite amounts", () => {
    expect(() => formatMoney(Number.NaN, getCountryPack("DZ")!)).toThrow(RangeError);
  });
});