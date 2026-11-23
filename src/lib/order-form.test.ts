import { describe, expect, it } from "vitest";
import { processOrderForm } from "./order-form";

const yes = () => true;

const form = (over: Record<string, string> = {}) => {
  const base: Record<string, string> = {
    token: "B85BOKTkCkZzIJIXjySVFw",
    idempotencyKey: "test-key-1234567890",
    variantId: "v1",
    quantity: "1",
    customerName: "Sara Benali",
    phone: "0550123456",
    region: "31",
    commune: "Oran",
    deliveryType: "STOPDESK",
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  return fd;
};

describe("processOrderForm", () => {
  it("blocks when the rate limit is reached", async () => {
    const r = await processOrderForm(form(), "ip-1", () => false);
    expect(r).toEqual({ status: "error", error: "rate_limited", fields: [] });
  });

  it("rejects a bad phone", async () => {
    const r = await processOrderForm(form({ phone: "12345" }), "ip-1", yes);
    expect(r.status === "error" && r.error).toBe("invalid_input");
  });

  it("reports an unknown region as the region field", async () => {
    const r = await processOrderForm(form({ region: "99" }), "ip-1", yes);
    expect(r.status === "error" && r.fields).toContain("region");
  });

  it("requires an address for home delivery", async () => {
    const r = await processOrderForm(form({ deliveryType: "HOME" }), "ip-1", yes);
    expect(r.status === "error" && r.fields).toContain("address");
  });
});