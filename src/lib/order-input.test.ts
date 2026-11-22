import { describe, expect, it } from "vitest";
import { OrderInput } from "./order-input";

const ok = {
  token: "B85BOKTkCkZzIJIXjySVFw",
  idempotencyKey: "a1b2c3d4e5f6g7h8i9",
  variantId: "v1",
  quantity: "1",
  customerName: "Sara Benali",
  phone: "0550 12 34 56",
  wilayaCode: "31",
  commune: "Oran",
  deliveryType: "STOPDESK",
};

const valid = (o: object) => OrderInput.safeParse(o).success;

describe("OrderInput", () => {
  it("accepts a stop-desk order and normalizes values", () => {
    const r = OrderInput.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.phone).toBe("0550123456");
      expect(r.data.wilayaCode).toBe(31);
      expect(r.data.messagingConsent).toBe(false);
    }
  });

  it("rejects a bad phone", () => expect(valid({ ...ok, phone: "12345" })).toBe(false));
  it("rejects wilaya 0 and 59+", () => {
    expect(valid({ ...ok, wilayaCode: "0" })).toBe(false);
    expect(valid({ ...ok, wilayaCode: "60" })).toBe(false);
  });
  it("rejects a malformed token", () => expect(valid({ ...ok, token: "abc" })).toBe(false));
  it("rejects quantity above 5", () => expect(valid({ ...ok, quantity: "6" })).toBe(false));
  it("rejects a short idempotency key", () => expect(valid({ ...ok, idempotencyKey: "short" })).toBe(false));

  it("requires an address for home delivery", () => {
    expect(valid({ ...ok, deliveryType: "HOME" })).toBe(false);
    expect(valid({ ...ok, deliveryType: "HOME", address: "Cité 500 logements, Bt 12" })).toBe(true);
  });
});