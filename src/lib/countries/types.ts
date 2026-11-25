// src/lib/countries/types.ts
// One pack per country. Pages read these values instead of hard-coding Algeria.

export type PaymentMethod = "COD";

export type CountryPack = {
  /** ISO 3166-1 alpha-2, uppercase */
  code: string;
  currency: string;
  /** Decimal places shown for prices (DZD: 0) */
  fractionDigits: number;
  dialCode: string;
  locales: readonly string[];
  defaultLocale: string;
  rtlLocales: readonly string[];
  paymentMethods: readonly PaymentMethod[];
  /** false = prepared but not offered to merchants yet */
  enabled: boolean;
};