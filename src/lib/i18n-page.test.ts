import { describe, expect, it } from "vitest";
import { PAGE_DICT, fill } from "./i18n-page";

describe("page dictionary", () => {
  it("all three languages have exactly the same keys", () => {
    const keys = Object.keys(PAGE_DICT.en).sort();
    expect(Object.keys(PAGE_DICT.ar).sort()).toEqual(keys);
    expect(Object.keys(PAGE_DICT.fr).sort()).toEqual(keys);
  });

  it("no text is empty", () => {
    for (const d of Object.values(PAGE_DICT)) {
      for (const v of Object.values(d)) expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it("Arabic text really is in Arabic script", () => {
    for (const v of Object.values(PAGE_DICT.ar)) expect(/[\u0600-\u06FF]/.test(v)).toBe(true);
  });

  it("only-left text has the {n} slot in every language and fill() replaces it", () => {
    for (const d of Object.values(PAGE_DICT)) {
      expect(d.onlyLeft).toContain("{n}");
      expect(fill(d.onlyLeft, 3)).toContain("3");
    }
  });
});