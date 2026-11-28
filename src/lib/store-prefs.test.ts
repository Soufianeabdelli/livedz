import { describe, expect, it } from "vitest";
import { resolveStoreLocale, resolveTheme } from "./store-prefs";

describe("store prefs", () => {
  it("theme defaults to dark for missing or unknown values", () => {
    expect(resolveTheme(undefined)).toBe("dark");
    expect(resolveTheme("purple")).toBe("dark");
  });

  it("theme accepts light", () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it("store locale defaults to Arabic for missing or unknown values", () => {
    expect(resolveStoreLocale(undefined)).toBe("ar");
    expect(resolveStoreLocale("de")).toBe("ar");
  });

  it("store locale keeps a valid choice", () => {
    expect(resolveStoreLocale("fr")).toBe("fr");
    expect(resolveStoreLocale("en")).toBe("en");
  });
});