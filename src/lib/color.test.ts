import { describe, it, expect } from "vitest";
import { contrastRatio, readableTextOn } from "./color";

describe("color helpers", () => {
  it("black on white is about 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("uses white text on a dark purple accent", () => {
    expect(readableTextOn("#5b1a8f")).toBe("#ffffff");
  });

  it("uses dark text on a light yellow accent", () => {
    expect(readableTextOn("#ffd400")).toBe("#111111");
  });

  it("accepts 3-digit hex and a missing #", () => {
    expect(readableTextOn("#fff")).toBe("#111111");
    expect(readableTextOn("000000")).toBe("#ffffff");
  });

  it("throws RangeError on invalid input", () => {
    expect(() => readableTextOn("purple")).toThrow(RangeError);
    expect(() => readableTextOn("#12345")).toThrow(RangeError);
  });
});