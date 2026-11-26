"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { lookupCode, type GoState } from "./actions";

const INIT: GoState = { status: "idle" };
const LOCALE_LABELS: Record<Locale, string> = { ar: "العربية", fr: "FR", en: "EN" };

const COPY: Record<Locale, { title: string; subtitle: string; placeholder: string; cta: string; searching: string; notFound: string; pickStore: string }> = {
  en: {
    title: "Enter Live Offer Code",
    subtitle: "Type the code shown under the QR code on screen to open the 15-second checkout.",
    placeholder: "e.g. K1 or #01",
    cta: "Open Offer",
    searching: "Opening...",
    notFound: "No active offer found for that code. Check the code on screen and try again.",
    pickStore: "Multiple stores use this code—pick yours:",
  },
  fr: {
    title: "Entrez le code du Live",
    subtitle: "Saisissez le code affiché sous le QR code à l'écran pour commander en 15 secondes.",
    placeholder: "ex. K1 ou #01",
    cta: "Ouvrir l'offre",
    searching: "Ouverture...",
    notFound: "Aucune offre active trouvée pour ce code. Vérifiez le code affiché à l'écran.",
    pickStore: "Plusieurs boutiques utilisent ce code — choisissez la vôtre :",
  },
  ar: {
    title: "أدخل كود العرض المباشر",
    subtitle: "اكتب الكود الظاهر أسفل رمز QR على الشاشة لفتح صفحة الطلب السريع.",
    placeholder: "مثال: K1 أو #01",
    cta: "فتح العرض",
    searching: "جاري الفتح...",
    notFound: "لم يتم العثور على عرض نشط بهذا الكود. تأكد من الكود الظاهر على الشاشة.",
    pickStore: "عدة متاجر تستخدم هذا الكود — اختر المتجر:",
  },
};

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const v = m?.[1] as Locale | undefined;
  return v && LOCALES.includes(v) ? v : null;
}

export function GoForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, action, pending] = useActionState(lookupCode, INIT);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = readCookieLocale();
    if (saved) setLocale(saved);
  }, []);

  function switchLocale(next: Locale) {
    setLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  const t = COPY[locale];

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif text-lg font-semibold text-ink">PinCasting</span>
        <div className="flex gap-1.5">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                locale === loc
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-card text-muted hover:border-accent"
              }`}
            >
              {LOCALE_LABELS[loc]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-semibold text-ink">{t.title}</h1>
        <p className="text-xs leading-relaxed text-muted">{t.subtitle}</p>
      </div>

      <form action={action} className="space-y-3">
        <input
          name="code"
          defaultValue={initialCode}
          required
          autoFocus
          autoComplete="off"
          placeholder={t.placeholder}
          className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-center text-lg font-bold tracking-wider uppercase text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink shadow-sm transition hover:opacity-95 disabled:opacity-50"
        >
          {pending ? t.searching : t.cta}
        </button>
      </form>

      {state.status === "not_found" && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-xs font-medium text-danger">
          {t.notFound}
        </p>
      )}

      {state.status === "multiple" && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">{t.pickStore}</p>
          <div className="space-y-2">
            {state.matches.map((m) => (
              <Link
                key={m.token}
                href={`/q/${m.token}`}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs transition hover:border-accent"
              >
                <div>
                  <div className="font-semibold text-ink">{m.merchantName}</div>
                  <div className="text-muted">{m.productName}</div>
                </div>
                <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-ink">#{m.code}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
