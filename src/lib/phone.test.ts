import { describe, expect, it } from "vitest";
import { normalizeDzPhone } from "./phone";

describe("normalizeDzPhone", () => {
  it.each([
    ["0550123456", "0550123456"],
    ["0550 12 34 56", "0550123456"],
    ["0550-12-34-56", "0550123456"],
    ["+213550123456", "0550123456"],
    ["+213 0550 12 34 56", "0550123456"],
    ["00213 661 98 76 54", "0661987654"],
    ["213770987654", "0770987654"],
    ["\u0660\u0665\u0665\u0660\u0661\u0662\u0663\u0664\u0665\u0666", "0550123456"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeDzPhone(input)).toBe(expected);
  });

  it.each([
    "", "   ", "abc", "055012345", "05501234567",
    "0450123456", "0550+123456", "k7al 0550123456",
  ])("rejects '%s'", (input) => {
    expect(normalizeDzPhone(input)).toBeNull();
  });

  it("rejects null and undefined", () => {
    expect(normalizeDzPhone(null)).toBeNull();
    expect(normalizeDzPhone(undefined)).toBeNull();
  });
});