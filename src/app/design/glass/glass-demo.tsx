"use client";

import { useRef, useState, useTransition } from "react";
import { GlassButton, GlassCard, GlassInput, GlassSelect, Sheet } from "@/components/ui/glass";
import { WILAYAS_69 } from "@/lib/countries/dz/regions-2026";
import type { CommuneRow } from "@/lib/countries/dz/communes";
import { listCommunes } from "./actions";

const PRODUCTS = [
  { id: "01", label: "#01 Strap", title: "Leather watch strap", price: 3200 },
  { id: "02", label: "#02 Wallet", title: "Carbon magnetic wallet", price: 2900 },
  { id: "03", label: "#03 Earbuds", title: "Noise cancelling earbuds", price: 4800 },
];
const fmt = new Intl.NumberFormat("fr-DZ");

export function CustomerPreview() {
  const [pid, setPid] = useState("01");
  const [delivery, setDelivery] = useState<"HOME" | "STOPDESK">("HOME");
  const [regionKey, setRegionKey] = useState("");
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [commune, setCommune] = useState("");
  const [loading, startLoad] = useTransition();
  const latest = useRef("");

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
  const product = PRODUCTS.find((p) => p.id === pid) ?? PRODUCTS[0];
  const fee = delivery === "HOME" ? 600 : 400;

  return (
    <section aria-label="Customer page preview" className="mx-auto w-full max-w-[420px]">
      <p className="mb-2 text-center text-xs text-emerald-200/70">Customer page (sample data)</p>
      <GlassCard className="overflow-hidden !rounded-[28px]">
        <div className="relative h-48 bg-gradient-to-b from-[#0c2b22] to-[#051812]">
          <svg viewBox="0 0 420 200" className="h-full w-full" aria-hidden="true">
            <circle cx="90" cy="60" r="46" fill="#1ce39f" fillOpacity="0.12" />
            <circle cx="340" cy="80" r="56" fill="#f59e0b" fillOpacity="0.1" />
            <rect x="170" y="48" width="80" height="104" rx="18" fill="#b87346" transform="rotate(18 210 100)" />
            <rect x="186" y="84" width="48" height="30" rx="6" fill="none" stroke="#e5e7eb" strokeWidth="5" transform="rotate(18 210 100)" />
          </svg>
          <div className="absolute inset-x-4 top-3 flex items-center justify-between">
            <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-bold">Boutique DZ</span>
            <span className="rounded-full bg-black/45 px-3 py-1 text-xs">Cash on delivery</span>
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
                className={"min-h-[44px] shrink-0 rounded-xl px-3.5 text-xs font-bold transition " + (p.id === pid ? "g-btn" : "g-input text-emerald-100/80")}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <h2 className="text-base font-extrabold">{product.title}</h2>
            <p className="g-num mt-0.5 text-lg font-extrabold text-emerald-300">{fmt.format(product.price)} DA</p>
          </div>

          <form className="mt-3 space-y-3" onSubmit={(e) => e.preventDefault()}>
            <GlassInput label="Full name" name="name" autoComplete="name" placeholder="Full name" />
            <div className="space-y-1">
              <label htmlFor="phone" className="text-xs font-bold text-emerald-100/90">Phone</label>
              <div className="flex gap-2" dir="ltr">
                <span className="g-input g-num flex min-h-[48px] items-center rounded-xl px-3 text-sm font-bold">+213</span>
                <input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="0551 23 45 67" className="g-input g-num min-h-[48px] w-full rounded-xl px-3.5 text-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <GlassSelect label="Wilaya" name="wilaya" value={regionKey} onChange={(e) => onRegion(e.target.value)}>
                <option value="" disabled>Choose wilaya</option>
                {WILAYAS_69.map((w) => (
                  <option key={w.key} value={w.key}>{w.code} - {w.name} - {w.nameAr}</option>
                ))}
              </GlassSelect>
              <GlassSelect label="Commune" name="commune" value={commune} onChange={(e) => setCommune(e.target.value)} disabled={!regionKey || loading}>
                <option value="" disabled>{loading ? "Loading..." : "Choose commune"}</option>
                {communes.map((c) => (
                  <option key={c.name} value={c.name}>{c.name} - {c.nameAr}</option>
                ))}
              </GlassSelect>
            </div>

            <div role="radiogroup" aria-label="Delivery type" className="grid grid-cols-2 gap-2">
              {(["HOME", "STOPDESK"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={delivery === d}
                  onClick={() => setDelivery(d)}
                  className="g-seg flex min-h-[52px] flex-col items-center justify-center rounded-xl text-sm font-bold"
                >
                  <span>{d === "HOME" ? "Home" : "Stop Desk"}</span>
                  <span className="g-num text-[11px] font-semibold opacity-80">{d === "HOME" ? "600" : "400"} DA</span>
                </button>
              ))}
            </div>

            <div className="flex items-end justify-between px-1 pt-1">
              <span className="g-num text-xs text-emerald-100/70">{fmt.format(product.price)} + {fee} DA</span>
              <span className="text-right">
                <span className="block text-[11px] uppercase tracking-wider text-emerald-200/70">Total</span>
                <span className="g-num text-xl font-extrabold">{fmt.format(product.price + fee)} DA</span>
              </span>
            </div>

            <GlassButton type="submit">Order now</GlassButton>
            <p className="text-center text-[11px] text-emerald-100/65">Your details are shared only with the seller.</p>
          </form>
        </Sheet>
      </GlassCard>
    </section>
  );
}