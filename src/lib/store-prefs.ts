import { isLocale, type Locale } from "./i18n";

export const THEME_COOKIE = "pc_theme";
export type Theme = "dark" | "light";

// Dark is the default look
export function resolveTheme(value: unknown): Theme {
  return value === "light" ? "light" : "dark";
}

// New store pages open in Arabic unless the buyer chose another language
export function resolveStoreLocale(value: unknown): Locale {
  return isLocale(value) ? value : "ar";
}

// Browser only: call from a click handler
export function writeThemeCookie(theme: Theme): void {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}