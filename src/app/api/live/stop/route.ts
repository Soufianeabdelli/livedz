import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getMerchantContext } from "@/lib/merchant";
import { stopCapture } from "@/lib/live/session-manager";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getMerchantContext(user);
  const stopped = await stopCapture(ctx.merchantId);

  if (!stopped) {
    return NextResponse.json({ error: "not_active" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
