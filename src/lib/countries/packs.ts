// src/lib/countries/packs.ts
import type { CountryPack } from "./types";

const DZ: CountryPack = {
  code: "DZ",
  currency: "DZD",
  fractionDigits: 0,
  dialCode: "+213",
  locales: ["ar", "fr", "en"],
  defaultLocale: "ar",
  rtlLocales: ["ar"],
  paymentMethods: ["COD"],
  enabled: true,
};

const PACKS: Record<string, CountryPack> = { DZ };

export function getCountryPack(code: string): CountryPack | undefined {
  return PACKS[code.trim().toUpperCase()];
}

export function isRtl(pack: CountryPack, locale: string): boolean {
  return pack.rtlLocales.includes(locale);
}

export function formatMoney(amount: number, pack: CountryPack, locale?: string): string {
  if (!Number.isFinite(amount)) throw new RangeError("amount must be a finite number");
  const loc = locale ?? pack.defaultLocale;
  return new Intl.NumberFormat(`${loc}-${pack.code}`, {
    style: "currency",
    currency: pack.currency,
    minimumFractionDigits: pack.fractionDigits,
    maximumFractionDigits: pack.fractionDigits,
  }).format(amount);
}