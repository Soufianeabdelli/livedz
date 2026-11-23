import { describe, expect, it } from "vitest";
import { parseDzshipError } from "./dzship-error";

describe("parseDzshipError", () => {
  it("reads the real validation error and maps the phone field", () => {
    const body = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        fields: { "order.recipient.phone": "String must contain at least 9 character(s)" },
      },
    };
    expect(parseDzshipError(400, body)).toEqual({
      code: "invalid_input",
      fields: ["phone"],
      detail: "Request validation failed",
    });
  });

  it("maps 401 to credentials_rejected", () => {
    expect(parseDzshipError(401, { error: { code: "X", message: "no" } }).code).toBe("credentials_rejected");
  });

  it("maps 429 to rate_limited", () => {
    expect(parseDzshipError(429, {}).code).toBe("rate_limited");
  });

  it("maps 503 to courier_unavailable", () => {
    expect(parseDzshipError(503, {}).code).toBe("courier_unavailable");
  });

  it("survives an unreadable body", () => {
    expect(parseDzshipError(400, null).code).toBe("courier_error");
    expect(parseDzshipError(400, "oops").fields).toEqual([]);
  });

  it("keeps unknown field paths as they are", () => {
    const r = parseDzshipError(400, { error: { code: "VALIDATION_ERROR", fields: { "order.extra": "x" } } });
    expect(r.fields).toEqual(["order.extra"]);
  });
});