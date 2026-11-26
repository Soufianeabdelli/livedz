"use client";

import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { submitOrder } from "./actions";
import { MSG } from "./messages";
import { Success } from "./success";
import { VariantPicker, type V } from "./variant-picker";
import { DZ_REGIONS, resolveDzRegion } from "@/lib/countries/dz/regions";
import { DEFAULT_LOCALE, LOCALES, ORDER_FORM_DICT, type Locale } from "@/lib/i18n";
import { writeLocaleCookie } from "@/lib/locale-cookie";
import type { OrderFormState } from "@/lib/order-form";

const INIT: OrderFormState = { status: "idle" };
const fmt = new Intl.NumberFormat("fr-DZ");
const LOCALE_LABELS: Record<Locale, string> = { ar: "العربية", fr: "FR", en: "EN" };

const EXTRA_COPY: Record<Locale, { qty: string; total: string; plusShip: string; option: string }> = {
  en: { qty: "Quantity", total: "Total", plusShip: "+ delivery", option: "Size / Option" },
  fr: { qty: "Quantité", total: "Total", plusShip: "+ livraison", option: "Option / Taille" },
  ar: { qty: "الكمية", total: "المجموع", plusShip: "+ التوصيل", option: "الخيار / المقاس" },
};

type DeliveryRateInfo = { wilayaCode: number; homeDzd: number; stopdeskDzd: number };
type Props = {
  token: string;
  idempotencyKey: string;
  variants: V[];
  deliveryRates?: DeliveryRateInfo[];
  priceDzd?: number;
  initialLocale?: Locale;
};

export function OrderForm({
  token,
  idempotencyKey,
  variants,
  deliveryRates = [],
  priceDzd = 0,
  initialLocale = DEFAULT_LOCALE,
}: Props) {
  const [state, action, pending] = useActionState(submitOrder, INIT);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [qty, setQty] = useState(1);
  const [delivery, setDelivery] = useState<"STOPDESK" | "HOME">("STOPDESK");
  const [regionKey, setRegionKey] = useState("");


  function switchLocale(next: Locale) {
    setLocale(next);
    writeLocaleCookie(next);
  }

  const t = ORDER_FORM_DICT[locale];
  const x = EXTRA_COPY[locale];
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
  const box = (f: string) =>
    `w-full rounded-[var(--radius-control)] border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent ${
      bad(f) ? "border-danger" : "border-line"
    }`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  const totalDzd = priceDzd * qty + (fee ?? 0);

  return (
    <form onSubmit={onSubmit} dir={isRtl ? "rtl" : "ltr"} className="space-y-4">
      {/* Language Switcher */}
      <div className="flex justify-end gap-1.5">
        {Array.from(LOCALES, (loc) => (
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

      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="quantity" value={String(qty)} />

      <VariantPicker variants={variants} invalid={bad("variantId")} label={x.option} />

      {/* Quantity Stepper + Delivery Pill Toggle */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-muted">{x.qty}</span>
          <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1.5">
            <button
              type="button"
              onClick={() => setQty((n) => Math.max(1, n - 1))}
              className="h-7 w-7 rounded-lg text-sm font-bold text-ink hover:bg-card"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="text-sm font-semibold text-ink">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((n) => Math.min(10, n + 1))}
              className="h-7 w-7 rounded-lg text-sm font-bold text-ink hover:bg-card"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-muted">{t.delivery}</span>
          <div className="grid grid-cols-2 gap-1.5">
            <label
              className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] border px-2.5 text-xs font-semibold transition ${
                delivery === "STOPDESK"
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-surface text-ink hover:border-accent"
              }`}
            >
              <input
                type="radio"
                name="deliveryType"
                value="STOPDESK"
                checked={delivery === "STOPDESK"}
                onChange={() => setDelivery("STOPDESK")}
                className="sr-only"
              />
              {t.stopdesk}
            </label>
            <label
              className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] border px-2.5 text-xs font-semibold transition ${
                delivery === "HOME"
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-surface text-ink hover:border-accent"
              }`}
            >
              <input
                type="radio"
                name="deliveryType"
                value="HOME"
                checked={delivery === "HOME"}
                onChange={() => setDelivery("HOME")}
                className="sr-only"
              />
              {t.home}
            </label>
          </div>
        </div>
      </div>

      {/* Buyer Contact */}
      <input name="customerName" placeholder={t.customerName} autoComplete="name" required className={box("customerName")} />
      <input name="phone" type="tel" inputMode="tel" placeholder={t.phone} autoComplete="tel" required className={box("phone")} />

      {/* Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          name="region"
          required
          value={regionKey}
          onChange={(e) => setRegionKey(e.target.value)}
          className={box("region")}
        >
          <option value="" disabled>{t.wilaya}</option>
          {Array.from(DZ_REGIONS, (r) => {
            const { key, name: regionLabel } = r;
            return <option key={key} value={key}>{regionLabel}</option>;
          })}
        </select>
        <input name="commune" placeholder={t.commune} required className={box("commune")} />
      </div>

      {fee !== null && (
        <p className="text-xs text-muted">
          {t.delivery} ({delivery === "HOME" ? t.home : t.stopdesk}): <b className="text-ink">{fmt.format(fee)} DA</b>
        </p>
      )}

      {delivery === "HOME" && (
        <div className="space-y-1">
          <label htmlFor="order-address" className="block text-xs font-semibold text-muted">
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

      {/* Confirmation & Consent Box */}
      <label className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-3 text-xs text-muted cursor-pointer">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 rounded accent-[var(--accent)]" />
        <span className="leading-relaxed">{t.consent}</span>
      </label>

      {state.status === "error" && (
        <p role="alert" className="text-xs font-medium text-danger">{MSG[state.error] ?? MSG.server_error}</p>
      )}

      {/* Live Total + Primary CTA */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {priceDzd > 0 && (
          <div className="shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{x.total}</div>
            <div className="text-base font-bold text-ink">
              {fmt.format(totalDzd)} DA
              {fee === null && <span className="ml-1 text-[11px] font-normal text-muted">{x.plusShip}</span>}
            </div>
          </div>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] flex-1 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink shadow-sm transition hover:opacity-95 disabled:opacity-50"
        >
          {pending ? t.submitting : t.submit}
        </button>
      </div>
    </form>
  );
}
