import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getMerchantContext } from "@/lib/merchant";
import { getCaptureStatus, listRecentLiveQuestions } from "@/lib/live/session-manager";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ctx = await getMerchantContext(user);
  const [status, questions] = await Promise.all([
    getCaptureStatus(ctx.merchantId),
    listRecentLiveQuestions(ctx.merchantId, 10),
  ]);

  return NextResponse.json({ ...status, questions });
}
