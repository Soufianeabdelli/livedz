"use client";

import { startTransition, useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import { submitOrder } from "./actions";
import { MSG } from "./messages";
import { Success } from "./success";
import { VariantPicker, type V } from "./variant-picker";
import { DZ_REGIONS, resolveDzRegion } from "@/lib/countries/dz/regions";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, ORDER_FORM_DICT, type Locale } from "@/lib/i18n";
import type { OrderFormState } from "@/lib/order-form";

const INIT: OrderFormState = { status: "idle" };
const fmt = new Intl.NumberFormat("fr-DZ");
const LOCALE_LABELS: Record<Locale, string> = { ar: "العربية", fr: "FR", en: "EN" };

type DeliveryRateInfo = { wilayaCode: number; homeDzd: number; stopdeskDzd: number };
type Props = {
  token: string;
  idempotencyKey: string;
  variants: V[];
  deliveryRates?: DeliveryRateInfo[];
  initialLocale?: Locale;
};

function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const val = match?.[1] as Locale | undefined;
  return val && LOCALES.includes(val) ? val : null;
}

export function OrderForm({
  token,
  idempotencyKey,
  variants,
  deliveryRates = [],
  initialLocale = DEFAULT_LOCALE,
}: Props) {
  const [state, action, pending] = useActionState(submitOrder, INIT);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [delivery, setDelivery] = useState<"STOPDESK" | "HOME">("STOPDESK");
  const [regionKey, setRegionKey] = useState("");

  useEffect(() => {
    const saved = readLocaleCookie();
    if (saved) setLocale(saved);
  }, []);

  function switchLocale(next: Locale) {
    setLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  const t = ORDER_FORM_DICT[locale];
  const isRtl = locale === "ar";

  const fee = useMemo(() => {
    const r = resolveDzRegion(regionKey);
    if (!r) return null;
    const rate = deliveryRates.find((d) => d.wilayaCode === r.courierCode);
    if (!rate) return null;
    return delivery === "HOME" ? rate.homeDzd : rate.stopdeskDzd;
  }, [regionKey, delivery, deliveryRates]);

  if (state.status === "success") {
    return <Success refCode={state.ref} totalDzd={state.totalDzd + (state.shippingFeeDzd ?? 0)} />;
  }

  const bad = (f: string) => state.status === "error" && state.fields.includes(f);
  const box = (f: string) => `w-full rounded-[var(--radius-control)] border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent ${bad(f) ? "border-danger" : "border-line"}`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} dir={isRtl ? "rtl" : "ltr"} className="space-y-3">
      <div className="flex justify-end gap-1.5">
        {LOCALES.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => switchLocale(loc)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              locale === loc ? "border-accent bg-accent text-accent-ink" : "border-line bg-card text-muted hover:border-accent"
            }`}
          >
            {LOCALE_LABELS[loc]}
          </button>
        ))}
      </div>

      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="quantity" value="1" />

      <VariantPicker variants={variants} invalid={bad("variantId")} label={locale === "ar" ? "الخيار / المقاس" : locale === "fr" ? "Option / Taille" : "Size / Option"} />

      <input name="customerName" placeholder={t.customerName} autoComplete="name" required className={box("customerName")} />
      <input name="phone" type="tel" inputMode="tel" placeholder={t.phone} autoComplete="tel" required className={box("phone")} />

      <select
        name="region"
        required
        value={regionKey}
        onChange={(e) => setRegionKey(e.target.value)}
        className={box("region")}
      >
        <option value="" disabled>{t.wilaya}</option>
        {DZ_REGIONS.map((r) => (
          <option key={r.key} value={r.key}>{r.name}</option>
        ))}
      </select>
      <input name="commune" placeholder={t.commune} required className={box("commune")} />

      <div className="flex gap-4">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="deliveryType" value="STOPDESK" checked={delivery === "STOPDESK"} onChange={() => setDelivery("STOPDESK")} /> {t.stopdesk}
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="deliveryType" value="HOME" checked={delivery === "HOME"} onChange={() => setDelivery("HOME")} /> {t.home}
        </label>
      </div>
      {fee !== null && (
        <p className="text-sm text-gray-600">
          {t.delivery} ({delivery === "HOME" ? t.home : t.stopdesk}): <b>{fmt.format(fee)} DA</b>
        </p>
      )}
      {delivery === "HOME" && (
        <div className="space-y-1">
          <label htmlFor="order-address" className="block text-sm font-medium text-gray-700">
            {t.address}
          </label>
          <textarea
            id="order-address"
            name="address"
            placeholder={t.addressPlaceholder}
            required
            rows={2}
            className={box("address")}
          />
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-1" />
        {t.consent}
      </label>

      {state.status === "error" && (
        <p role="alert" className="text-red-600">{MSG[state.error] ?? MSG.server_error}</p>
      )}

      <button type="submit" disabled={pending} className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink shadow-sm transition hover:opacity-95 disabled:opacity-50">
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
