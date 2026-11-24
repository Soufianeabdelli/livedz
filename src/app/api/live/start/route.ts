import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getMerchantContext } from "@/lib/merchant";
import { startCapture } from "@/lib/live/session-manager";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getMerchantContext(user);

  let body: { tiktokUsername?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const username = body.tiktokUsername;
  if (!username || typeof username !== "string" || username.trim().length < 2 || username.trim().length > 50) {
    return NextResponse.json({ error: "invalid_username" }, { status: 400 });
  }

  const result = await startCapture({
    merchantId: ctx.merchantId,
    tiktokUsername: username,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    sessionId: result.sessionId,
    sessionToken: result.sessionToken,
    claimPath: result.claimPath,
  });
}
