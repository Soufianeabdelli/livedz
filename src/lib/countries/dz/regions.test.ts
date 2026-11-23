import { describe, expect, it } from "vitest";
import { DZ_REGIONS, resolveDzRegion } from "./regions";

describe("DZ regions", () => {
  it("has 69 entries with unique keys", () => {
    expect(DZ_REGIONS).toHaveLength(69);
    expect(new Set(DZ_REGIONS.map((r) => r.key)).size).toBe(69);
  });
  it("every courier code is between 1 and 58", () => {
    expect(DZ_REGIONS.every((r) => r.courierCode >= 1 && r.courierCode <= 58)).toBe(true);
  });
  it("keeps the known codes", () => {
    expect(resolveDzRegion("16")?.name).toBe("Alger");
    expect(resolveDzRegion("31")?.name).toBe("Oran");
    expect(resolveDzRegion("58")?.name).toBe("El Meniaa");
  });
  it("maps new wilayas to their parent", () => {
    expect(resolveDzRegion("n-barika")?.courierCode).toBe(5);
    expect(resolveDzRegion("n-bou-saada")?.courierCode).toBe(28);
  });
  it("rejects unknown keys", () => {
    expect(resolveDzRegion("59")).toBeNull();
    expect(resolveDzRegion("")).toBeNull();
  });
});