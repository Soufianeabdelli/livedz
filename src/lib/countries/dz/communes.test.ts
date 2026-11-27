import { describe, expect, it } from "vitest";
import { communesForRegion } from "./communes";
import { NEW_WILAYA_COMMUNES } from "./regions-2026";

describe("communesForRegion", () => {
  it("returns an empty list for an unknown region key", () => {
    expect(communesForRegion("nope", [{ name: "X", nameAr: "x" }])).toEqual([]);
  });

  it("a new wilaya returns exactly its own moved communes", () => {
    expect(communesForRegion("n-aflou", [])).toHaveLength(NEW_WILAYA_COMMUNES["n-aflou"].length);
  });

  it("the parent wilaya hides communes that moved to a new wilaya", () => {
    const moved = NEW_WILAYA_COMMUNES["n-aflou"][0];
    const rows = [
      { name: moved.name, nameAr: moved.nameAr },
      { name: "Laghouat", nameAr: "x" },
    ];
    const out = communesForRegion("3", rows).map((c) => c.name);
    expect(out).toContain("Laghouat");
    expect(out).not.toContain(moved.name);
  });
});