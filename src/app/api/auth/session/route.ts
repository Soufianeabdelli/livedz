import { NextResponse, type NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/session";

const ORIGIN = new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== ORIGIN) return fail("bad_origin", 403); // CSRF guard
  const body = await req.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  if (!idToken) return fail("missing_token", 400);
  try {
    const d = await adminAuth().verifyIdToken(idToken, true);
    if (Date.now() / 1000 - d.auth_time > 5 * 60) return fail("recent_login_required", 401);
    const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SEC * 1000 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return res;
  } catch {
    return fail("invalid_token", 401);
  }
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("origin") !== ORIGIN) return fail("bad_origin", 403);
  const value = req.cookies.get(SESSION_COOKIE)?.value;
  if (value) {
    try {
      const d = await adminAuth().verifySessionCookie(value);
      await adminAuth().revokeRefreshTokens(d.sub); // log out on all devices
    } catch {}
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}