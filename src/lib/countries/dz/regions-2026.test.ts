import { describe, expect, it } from "vitest";
import { resolveDzRegion } from "./regions";
import { NEW_WILAYA_COMMUNES, WILAYAS_69 } from "./regions-2026";

describe("regions-2026", () => {
  it("has 69 wilayas, codes 1..69, each with Latin and Arabic names", () => {
    expect(WILAYAS_69).toHaveLength(69);
    WILAYAS_69.forEach((w, i) => {
      expect(w.code).toBe(i + 1);
      expect(w.name.length).toBeGreaterThan(1);
      expect(w.nameAr.length).toBeGreaterThan(1);
    });
  });

  it("ships every wilaya with a courier code between 1 and 58", () => {
    for (const w of WILAYAS_69) {
      expect(w.courierCode).toBeGreaterThanOrEqual(1);
      expect(w.courierCode).toBeLessThanOrEqual(58);
    }
  });

  it("every key exists in regions.ts with the same courier code", () => {
    for (const w of WILAYAS_69) {
      const r = resolveDzRegion(w.key);
      expect(r, "region " + w.code).not.toBeNull();
      expect(r?.courierCode).toBe(w.courierCode);
    }
  });

  it("the 11 new wilayas hold the 108 moved communes", () => {
    expect(WILAYAS_69.filter((w) => w.isNew)).toHaveLength(11);
    const total = Object.values(NEW_WILAYA_COMMUNES).reduce((s, c) => s + c.length, 0);
    expect(total).toBe(108);
  });
});