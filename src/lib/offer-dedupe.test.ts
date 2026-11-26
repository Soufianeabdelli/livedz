import { describe, it, expect } from "vitest";
import { dedupeByOffer } from "./offer-dedupe";

describe("dedupeByOffer", () => {
  it("keeps one card per merchant and product, preferring the primary card", () => {
    const cards = [
      { token: "a", merchantId: "m1", productId: "p1", affiliateId: "aff1" },
      { token: "b", merchantId: "m1", productId: "p1", affiliateId: null },
    ];
    expect(dedupeByOffer(cards).map((c) => c.token)).toEqual(["b"]);
  });

  it("keeps different products under the same merchant", () => {
    const cards = [
      { token: "a", merchantId: "m1", productId: "p1", affiliateId: null },
      { token: "b", merchantId: "m1", productId: "p2", affiliateId: null },
    ];
    expect(dedupeByOffer(cards).map((c) => c.token)).toEqual(["a", "b"]);
  });

  it("keeps the same product code across different merchants", () => {
    const cards = [
      { token: "a", merchantId: "m1", productId: "p1", affiliateId: null },
      { token: "b", merchantId: "m2", productId: "p1", affiliateId: null },
    ];
    expect(dedupeByOffer(cards).map((c) => c.token)).toEqual(["a", "b"]);
  });
});
