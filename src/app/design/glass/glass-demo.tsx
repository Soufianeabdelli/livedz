"use client";

import { useRef, useState, useTransition } from "react";
import { GlassButton, GlassCard, GlassInput, GlassSelect, Sheet } from "@/components/ui/glass";
import { WILAYAS_69 } from "@/lib/countries/dz/regions-2026";
import type { CommuneRow } from "@/lib/countries/dz/communes";
import type { Locale } from "@/lib/i18n";
import { STORE_DICT } from "@/lib/i18n-store";
import { listCommunes } from "./actions";

const PRODUCTS = [
  { id: "01", label: "#01", title: { en: "Leather watch strap", fr: "Bracelet de montre en cuir", ar: "\u062D\u0632\u0627\u0645 \u0633\u0627\u0639\u0629 \u062C\u0644\u062F\u064A" }, price: 3200 },
  { id: "02", label: "#02", title: { en: "Carbon magnetic wallet", fr: "Portefeuille magn\u00E9tique en carbone", ar: "\u0645\u062D\u0641\u0638\u0629 \u0645\u063A\u0646\u0627\u0637\u064A\u0633\u064A\u0629 \u0645\u0646 \u0627\u0644\u0643\u0631\u0628\u0648\u0646" }, price: 2900 },
  { id: "03", label: "#03", title: { en: "Noise cancelling earbuds", fr: "\u00C9couteurs \u00E0 r\u00E9duction de bruit", ar: "\u0633\u0645\u0627\u0639\u0627\u062A \u0639\u0632\u0644 \u0627\u0644\u0636\u0648\u0636\u0627\u0621" }, price: 4800 },
];
const fmt = new Intl.NumberFormat("fr-DZ");

export function CustomerPreview({ locale }: { locale: Locale }) {
  const t = STORE_DICT[locale];
  const ar = locale === "ar";
  const [pid, setPid] = useState("01");
  const [delivery, setDelivery] = useState<"HOME" | "STOPDESK">("HOME");
  const [regionKey, setRegionKey] = useState("");
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [commune, setCommune] = useState("");
  const [loading, startLoad] = useTransition();
  const latest = useRef("");

  const product = PRODUCTS.find((p) => p.id === pid) ?? PRODUCTS[0];
  const fee = delivery === "HOME" ? 600 : 400;

  function onRegion(key: string) {
    setRegionKey(key);
    setCommunes([]);
    setCommune("");
    latest.current = key;
    startLoad(async () => {
      const rows = await listCommunes(key);
      if (latest.current !== key) return;
      setCommunes(rows);
      setCommune(rows[0]?.name ?? "");
    });
  }

  // Prices always read left to right, even inside Arabic text
  const money = (n: number) => (
    <span dir="ltr" className="g-num inline-flex items-baseline gap-1"><span>{fmt.format(n)}</span><span>{t.currency}</span></span>
  );

  return (
    <section aria-label="Customer page preview" className="mx-auto w-full max-w-[420px]">
      <GlassCard className="overflow-hidden !rounded-[28px]">
        <div className="relative h-44 bg-gradient-to-b from-[#0c2b22] to-[#051812]">
          <svg viewBox="0 0 420 200" className="h-full w-full" aria-hidden="true">
            <circle cx="90" cy="60" r="46" fill="#1ce39f" fillOpacity="0.12" />
            <rect x="170" y="48" width="80" height="104" rx="18" fill="#b87346" transform="rotate(18 210 100)" />
          </svg>
          <div className="absolute inset-x-4 top-3 flex items-center justify-between">
            <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-white">Boutique DZ</span>
            <span className="rounded-full bg-black/45 px-3 py-1 text-xs text-white">{t.cod}</span>
          </div>
        </div>

        <Sheet className="-mt-4 px-4 pb-6 pt-1">
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Products">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === pid}
                onClick={() => setPid(p.id)}
                className={"g-num min-h-[44px] shrink-0 rounded-xl px-4 text-xs font-bold " + (p.id === pid ? "g-btn" : "g-input")}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <h2 className="text-base font-extrabold">{product.title[locale]}</h2>
            <p className="mt-0.5 text-lg font-extrabold text-emerald-300">{money(product.price)}</p>
          </div>

          <form className="mt-3 space-y-3" onSubmit={(e) => e.preventDefault()}>
            <GlassInput label={t.fullName} name="name" autoComplete="name" placeholder={t.fullName} />
            <div className="space-y-1">
              <label htmlFor="phone" className="text-xs font-bold text-emerald-100/90">{t.phone}</label>
              <div className="flex gap-2" dir="ltr">
                <span className="g-input g-num flex min-h-[48px] items-center rounded-xl px-3 text-sm font-bold">+213</span>
                <input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="0551 23 45 67" className="g-input g-num min-h-[48px] w-full rounded-xl px-3.5 text-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <GlassSelect label={t.wilaya} name="wilaya" value={regionKey} onChange={(e) => onRegion(e.target.value)}>
                <option value="" disabled>{t.chooseWilaya}</option>
                {WILAYAS_69.map((w) => (
                  <option key={w.key} value={w.key}>{w.code} - {ar ? w.nameAr : w.name}</option>
                ))}
              </GlassSelect>
              <GlassSelect label={t.commune} name="commune" value={commune} onChange={(e) => setCommune(e.target.value)} disabled={!regionKey || loading}>
                <option value="" disabled>{loading ? t.loading : t.chooseCommune}</option>
                {communes.map((c) => (
                  <option key={c.name} value={c.name}>{ar ? c.nameAr : c.name}</option>
                ))}
              </GlassSelect>
            </div>

            <div role="radiogroup" aria-label="Delivery" className="grid grid-cols-2 gap-2">
              {(["HOME", "STOPDESK"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={delivery === d}
                  onClick={() => setDelivery(d)}
                  className="g-seg flex min-h-[52px] flex-col items-center justify-center rounded-xl text-sm font-bold"
                >
                  <span>{d === "HOME" ? t.home : t.stopDesk}</span>
                  <span className="text-[11px] font-semibold opacity-80">{money(d === "HOME" ? 600 : 400)}</span>
                </button>
              ))}
            </div>

            <div className="flex items-end justify-between px-1 pt-1">
              <span className="text-xs text-emerald-100/70">
                <span dir="ltr" className="g-num">{fmt.format(product.price)} + {fee}</span>
              </span>
              <span className="text-end">
                <span className="block text-[11px] uppercase tracking-wider text-emerald-200/70">{t.total}</span>
                <span className="text-xl font-extrabold">{money(product.price + fee)}</span>
              </span>
            </div>

            <GlassButton type="submit">{t.orderNow}</GlassButton>
            <p className="text-center text-[11px] text-emerald-100/65">{t.privacy}</p>
          </form>
        </Sheet>
      </GlassCard>
    </section>
  );
}