import { describe, expect, it } from "vitest";
import { STORE_DICT } from "./i18n-store";

describe("store dictionary", () => {
  it("all three languages have exactly the same keys", () => {
    const keys = Object.keys(STORE_DICT.en).sort();
    expect(Object.keys(STORE_DICT.ar).sort()).toEqual(keys);
    expect(Object.keys(STORE_DICT.fr).sort()).toEqual(keys);
  });

  it("no text is empty", () => {
    for (const d of Object.values(STORE_DICT)) {
      for (const v of Object.values(d)) expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it("Arabic text really is in Arabic script", () => {
    for (const v of Object.values(STORE_DICT.ar)) expect(/[\u0600-\u06FF]/.test(v)).toBe(true);
  });
});