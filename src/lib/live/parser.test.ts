import { describe, expect, it } from "vitest";
import { extractProductCode, normalizeDigits, parseComment } from "./parser";

describe("normalizeDigits", () => {
  it("converts Eastern-Arabic and Persian digits to ASCII", () => {
    expect(normalizeDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(normalizeDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });

  it("converts full-width ASCII characters", () => {
    expect(normalizeDigits("Ｋ１　ｘ２")).toBe("K1 x2");
  });

  it("handles mixed text", () => {
    expect(normalizeDigits("K٣")).toBe("K3");
  });
});

describe("parseComment", () => {
  it.each([
    ["K1", "K1"],
    ["k1", "K1"],
    ["K 1", "K1"],
    ["P12", "P12"],
    ["A03", "A03"],
    ["Ｋ１", "K1"],
  ])("matches %s → %s", (input, expected) => {
    const r = parseComment(input);
    expect(r).toMatchObject({ match: true, productCode: expected, quantity: 1 });
  });

  it.each([
    ["code 3", "K3"],
    ["Code3", "K3"],
    ["كود3", "K3"],
    ["كود 12", "K12"],
  ])("matches %s → %s with default prefix", (input, expected) => {
    expect(parseComment(input)).toMatchObject({ match: true, productCode: expected });
  });

  it("uses configurable codePrefix per merchant", () => {
    expect(parseComment("code 3", { codePrefix: "P" })).toMatchObject({ match: true, productCode: "P3" });
    expect(parseComment("كود 7", { codePrefix: "AB" })).toMatchObject({ match: true, productCode: "AB7" });
  });

  it("parses quantities before and after code", () => {
    expect(parseComment("K1 x2")).toMatchObject({ match: true, productCode: "K1", quantity: 2 });
    expect(parseComment("K1 ×3")).toMatchObject({ match: true, productCode: "K1", quantity: 3 });
    expect(parseComment("2 K1")).toMatchObject({ match: true, productCode: "K1", quantity: 2 });
    expect(parseComment("K1 x99")).toMatchObject({ match: true, productCode: "K1", quantity: 1 });
  });

  it("extracts size and color", () => {
    expect(parseComment("K1 L")).toMatchObject({ match: true, productCode: "K1", size: "L" });
    expect(parseComment("K1 42")).toMatchObject({ match: true, productCode: "K1", quantity: 1, size: "42" });
    expect(parseComment("K1 noir")).toMatchObject({ match: true, productCode: "K1", color: "noir" });
    expect(parseComment("K1 أسود")).toMatchObject({ match: true, productCode: "K1", color: "أسود" });
    expect(parseComment("K1 x2 42 rouge")).toMatchObject({
      match: true, productCode: "K1", quantity: 2, size: "42", color: "rouge",
    });
  });

  it("resolves custom variant sizes/colors using product catalog hints", () => {
    const r = parseComment("K1 5XL camel", { knownSizes: ["5XL"], knownColors: ["Camel"] });
    expect(r).toMatchObject({ match: true, productCode: "K1", quantity: 1, size: "5XL", color: "camel" });
  });

  it("strips Arabic, Algerian, and French intent prefixes", () => {
    expect(parseComment("أريد K1")).toMatchObject({ match: true, productCode: "K1" });
    expect(parseComment("بغيت K1 L")).toMatchObject({ match: true, productCode: "K1", size: "L" });
    expect(parseComment("je veux K3")).toMatchObject({ match: true, productCode: "K3" });
  });

  it("handles Eastern-Arabic digits", () => {
    expect(parseComment("K٣")).toMatchObject({ match: true, productCode: "K3" });
    expect(parseComment("كود٣")).toMatchObject({ match: true, productCode: "K3" });
  });

  it.each([
    ["K1 combien?", "K1"],
    ["K1 شحال", "K1"],
    ["بقداه K2", "K2"],
    ["K1 ?", "K1"],
    ["K3 prix livraison?", "K3"],
    ["شحال السعر؟", undefined],
  ])("flags question '%s' as isQuestion without creating order", (input, expectedCode) => {
    const r = parseComment(input);
    expect(r).toEqual({ match: false, isQuestion: true, productCode: expectedCode });
  });

  it("returns no match for non-order chat", () => {
    expect(parseComment("hello everyone")).toEqual({ match: false });
    expect(parseComment("")).toEqual({ match: false });
    expect(parseComment("K1 " + "a".repeat(200))).toEqual({ match: false });
    expect(parseComment("🔥🔥🔥")).toEqual({ match: false });
    expect(parseComment("42")).toEqual({ match: false });
  });

  it("extracts candidate product code before DB variant lookup", () => {
    expect(extractProductCode("بغيت كود 4 42", "R")).toBe("R4");
    expect(extractProductCode("hello")).toBeNull();
  });
});
