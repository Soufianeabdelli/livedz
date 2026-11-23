export type CourierErrorCode =
  | "invalid_input"
  | "credentials_rejected"
  | "rate_limited"
  | "courier_unavailable"
  | "courier_error";

export type CourierError = { code: CourierErrorCode; fields: string[]; detail: string };

// dzship field paths -> our form field names
const FIELD_MAP: Record<string, string> = {
  "order.recipient.phone": "phone",
  "order.recipient.fullName": "customerName",
  "order.recipient.wilayaCode": "region",
  "order.recipient.communeName": "commune",
  "order.recipient.address": "address",
  "order.codAmount": "amount",
  "order.productList": "product",
};

export function parseDzshipError(status: number, body: unknown): CourierError {
  const e = body && typeof body === "object" ? (body as { error?: unknown }).error : undefined;
  const obj = e && typeof e === "object" ? (e as Record<string, unknown>) : {};
  const rawFields = obj.fields && typeof obj.fields === "object" ? Object.keys(obj.fields) : [];
  const fields = [...new Set(rawFields.map((k) => FIELD_MAP[k] ?? k))];
  const detail = (typeof obj.message === "string" ? obj.message : typeof e === "string" ? e : "").slice(0, 200);

  let code: CourierErrorCode = "courier_error";
  if (obj.code === "VALIDATION_ERROR" || fields.length > 0) code = "invalid_input";
  else if (status === 401 || status === 403) code = "credentials_rejected"; // assumption, check with a real key
  else if (status === 429) code = "rate_limited";
  else if (status >= 500) code = "courier_unavailable";
  return { code, fields, detail };
}