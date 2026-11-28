"use client";

import { setLocale, setTheme } from "@/app/prefs-actions";
import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/store-prefs";
import { cn } from "./cn";

const LANGS: { value: Locale; label: string; name: string }[] = [
  { value: "ar", label: "AR", name: "Arabic" },
  { value: "fr", label: "FR", name: "French" },
  { value: "en", label: "EN", name: "English" },
];

export function LanguageSwitcher({ current, className }: { current: Locale; className?: string }) {
  return (
    <form action={setLocale} dir="ltr" className={cn("flex gap-1.5", className)}>
      {LANGS.map((l) => (
        <button
          key={l.value}
          type="submit"
          name="value"
          value={l.value}
          role="radio"
          aria-checked={l.value === current}
          aria-label={l.name}
          className="g-seg g-num min-h-[44px] min-w-[44px] rounded-xl px-2 text-xs font-extrabold"
        >
          {l.label}
        </button>
      ))}
    </form>
  );
}

export function ThemeToggle({ current, className }: { current: Theme; className?: string }) {
  const dark = current === "dark";
  return (
    <form action={setTheme} className={className}>
      <button
        type="submit"
        name="value"
        value={dark ? "light" : "dark"}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="g-seg flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {dark ? (
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </>
          )}
        </svg>
      </button>
    </form>
  );
}