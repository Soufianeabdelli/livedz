import "server-only";
import { parseDzshipError, type CourierErrorCode } from "./dzship-error";

const BASE = "https://freeship.dzbuild.com";

export type CourierCreds = { courier: string; credentials?: Record<string, string>; fromWilaya?: number };

export type ShipInput = {
  fullName: string;
  phone: string;
  wilayaCode: number; // courier code 1..58, never 59+
  communeName: string;
  address?: string;
  deliveryType: "home" | "stopdesk";
  productList: string;
  codAmount: number;
  reference: string;
  idempotencyKey?: string;
};

export type ShipResult =
  | { ok: true; trackingNumber: string; status: string }
  | { ok: false; error: CourierErrorCode | "network_error"; fields: string[]; detail: string; status?: number };

export type LookupResult =
  | { found: true; trackingNumber: string; status: string }
  | { found: false; definiteNotFound: boolean };

export async function createParcel(c: CourierCreds, o: ShipInput): Promise<ShipResult> {
  if (o.wilayaCode < 1 || o.wilayaCode > 58) {
    return { ok: false, error: "invalid_input", fields: ["region"], detail: "wilaya code must be 1..58" };
  }
  const body = {
    courier: c.courier,
    ...(c.credentials ? { credentials: c.credentials } : {}),
    ...(c.fromWilaya ? { options: { fromWilaya: c.fromWilaya } } : {}),
    order: {
      recipient: {
        fullName: o.fullName,
        phone: o.phone,
        wilayaCode: o.wilayaCode,
        communeName: o.communeName,
        ...(o.address ? { address: o.address } : {}),
      },
      deliveryType: o.deliveryType,
      productList: o.productList,
      codAmount: o.codAmount,
      reference: o.reference,
    },
  };
  try {
    const res = await fetch(`${BASE}/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(o.idempotencyKey ? { "Idempotency-Key": o.idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const j: unknown = await res.json().catch(() => null);
    const t = j && typeof j === "object" ? (j as Record<string, unknown>) : {};
    if (res.ok && typeof t.trackingNumber === "string") {
      return { ok: true, trackingNumber: t.trackingNumber, status: String(t.status ?? "created") };
    }
    const err = parseDzshipError(res.status, j);
    return { ok: false, error: err.code, fields: err.fields, detail: err.detail, status: res.status };
  } catch {
    return { ok: false, error: "network_error", fields: [], detail: "network_error" };
  }
}

/**
 * Queries DzShip by reference to reconcile orders stuck in SHIPMENT_UNKNOWN.
 */
export async function findParcelByReference(c: CourierCreds, reference: string): Promise<LookupResult> {
  try {
    const params = new URLSearchParams({ courier: c.courier, reference });
    const res = await fetch(`${BASE}/v1/orders/lookup?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courier: c.courier,
        reference,
        ...(c.credentials ? { credentials: c.credentials } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (res.status === 404) return { found: false, definiteNotFound: true };
    if (!res.ok) return { found: false, definiteNotFound: false };
    const j: unknown = await res.json().catch(() => null);
    const t = j && typeof j === "object" ? (j as Record<string, unknown>) : {};
    if (typeof t.trackingNumber === "string" && t.trackingNumber) {
      return { found: true, trackingNumber: t.trackingNumber, status: String(t.status ?? "created") };
    }
    return { found: false, definiteNotFound: false };
  } catch {
    return { found: false, definiteNotFound: false };
  }
}
