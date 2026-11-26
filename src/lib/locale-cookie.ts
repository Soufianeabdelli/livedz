import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export function isLocale(value?: string | null): value is Locale {
  return Boolean(value && (LOCALES as readonly string[]).includes(value));
}

export function resolveLocale(value?: string | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}
