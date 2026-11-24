import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncCourierOrderStatus } from "@/lib/courier-sync";

function verifySecret(header: string | null, expected: string | undefined): boolean {
  if (!header || !expected) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.COURIER_WEBHOOK_SECRET;
  const provided =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!verifySecret(provided, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { trackingNumber?: string; orderId?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.status !== "string" || (!body.trackingNumber && !body.orderId)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const res = await syncCourierOrderStatus({
    trackingNumber: body.trackingNumber,
    orderId: body.orderId,
    courierStatus: body.status,
  });

  if (!res.ok) {
    const code = res.error === "not_found" ? 404 : res.error === "unknown_status" ? 400 : 409;
    return NextResponse.json({ error: res.error }, { status: code });
  }

  return NextResponse.json({ ok: true, orderId: res.orderId, status: res.status });
}
