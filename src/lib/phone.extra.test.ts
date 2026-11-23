import { describe, expect, it } from "vitest";
import { normalizeDzPhone as n } from "./phone";

describe("normalizeDzPhone extra cases", () => {
  it("accepts a number without the leading 0", () => expect(n("550123456")).toBe("0550123456"));
  it("accepts 9 digits with spaces", () => expect(n("661 98 76 54")).toBe("0661987654"));
  it("accepts +213 (0) format", () => expect(n("+213 (0)550 12 34 56")).toBe("0550123456"));
  it("accepts Persian digits", () =>
    expect(n("\u06F0\u06F5\u06F5\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6")).toBe("0550123456"));
  it("rejects an extra leading zero", () => expect(n("00550123456")).toBeNull());
  it("rejects a 9-digit non-mobile", () => expect(n("450123456")).toBeNull());
  it("rejects a landline", () => expect(n("0212345678")).toBeNull());
  it("rejects a foreign number", () => expect(n("+33612345678")).toBeNull());
});