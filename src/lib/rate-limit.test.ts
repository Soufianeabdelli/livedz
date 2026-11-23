import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks", () => {
    let t = 0;
    const allow = createRateLimiter(3, 1000, () => t);
    expect([allow("a"), allow("a"), allow("a"), allow("a")]).toEqual([true, true, true, false]);
  });

  it("keeps clients separate", () => {
    let t = 0;
    const allow = createRateLimiter(1, 1000, () => t);
    expect(allow("a")).toBe(true);
    expect(allow("a")).toBe(false);
    expect(allow("b")).toBe(true);
  });

  it("resets after the window", () => {
    let t = 0;
    const allow = createRateLimiter(1, 1000, () => t);
    expect(allow("a")).toBe(true);
    expect(allow("a")).toBe(false);
    t = 1000;
    expect(allow("a")).toBe(true);
  });
});