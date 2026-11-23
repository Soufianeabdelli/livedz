import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_SEC = 5 * 24 * 60 * 60; // 5 days

export type SessionUser = { uid: string; email: string | null; phone: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  await connection(); // computed on every request (Firebase checks the current time)
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const d = await adminAuth().verifySessionCookie(value, true);
    return { uid: d.uid, email: d.email ?? null, phone: d.phone_number ?? null };
  } catch {
    return null;
  }
}