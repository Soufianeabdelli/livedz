"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { THEME_COOKIE } from "@/lib/store-prefs";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Both actions validate the value on the server before saving anything
export async function setLocale(formData: FormData): Promise<void> {
  const value = formData.get("value");
  if (!isLocale(value)) return;
  (await cookies()).set(LOCALE_COOKIE, value, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
}

export async function setTheme(formData: FormData): Promise<void> {
  const value = formData.get("value");
  if (value !== "dark" && value !== "light") return;
  (await cookies()).set(THEME_COOKIE, value, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
}