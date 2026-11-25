import { LOCALES, type Locale } from "@/lib/i18n";
import { setLocale } from "./locale-actions";

const NATIVE_NAMES: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
  fr: "Français",
};

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  return (
    <nav
      aria-label={label}
      className="flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1 shadow-sm"
    >
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <form key={locale} action={setLocale}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              aria-pressed={active}
              lang={locale}
              className={
                "rounded-full px-4 py-2 text-sm font-medium transition " +
                (active ? "bg-stone-900 text-stone-50" : "text-stone-600 hover:bg-stone-100")
              }
            >
              {NATIVE_NAMES[locale]}
            </button>
          </form>
        );
      })}
    </nav>
  );
}