import type { Locale } from "./i18n";

export type StoreDict = {
  cod: string;
  fullName: string;
  phone: string;
  wilaya: string;
  commune: string;
  chooseWilaya: string;
  chooseCommune: string;
  loading: string;
  home: string;
  stopDesk: string;
  total: string;
  orderNow: string;
  privacy: string;
  currency: string;
};

// Arabic is written as unicode escapes so this file stays plain ASCII
export const STORE_DICT: Record<Locale, StoreDict> = {
  ar: {
    cod: "\u0627\u0644\u062F\u0641\u0639 \u0639\u0646\u062F \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645",
    fullName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644",
    phone: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
    wilaya: "\u0627\u0644\u0648\u0644\u0627\u064A\u0629",
    commune: "\u0627\u0644\u0628\u0644\u062F\u064A\u0629",
    chooseWilaya: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0648\u0644\u0627\u064A\u0629",
    chooseCommune: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0628\u0644\u062F\u064A\u0629",
    loading: "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644",
    home: "\u0627\u0644\u0645\u0646\u0632\u0644",
    stopDesk: "\u0645\u0643\u062A\u0628 \u0627\u0644\u062A\u0648\u0635\u064A\u0644",
    total: "\u0627\u0644\u0645\u062C\u0645\u0648\u0639",
    orderNow: "\u0627\u0637\u0644\u0628 \u0627\u0644\u0622\u0646",
    privacy: "\u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u062A\u0635\u0644 \u0625\u0644\u0649 \u0627\u0644\u0628\u0627\u0626\u0639 \u0641\u0642\u0637",
    currency: "\u062F\u062C",
  },
  fr: {
    cod: "Paiement \u00E0 la livraison",
    fullName: "Nom complet",
    phone: "T\u00E9l\u00E9phone",
    wilaya: "Wilaya",
    commune: "Commune",
    chooseWilaya: "Choisir la wilaya",
    chooseCommune: "Choisir la commune",
    loading: "Chargement",
    home: "Domicile",
    stopDesk: "Stop Desk",
    total: "Total",
    orderNow: "Commander",
    privacy: "Vos informations sont partag\u00E9es uniquement avec le vendeur.",
    currency: "DA",
  },
  en: {
    cod: "Cash on delivery",
    fullName: "Full name",
    phone: "Phone",
    wilaya: "Wilaya",
    commune: "Commune",
    chooseWilaya: "Choose wilaya",
    chooseCommune: "Choose commune",
    loading: "Loading",
    home: "Home",
    stopDesk: "Stop Desk",
    total: "Total",
    orderNow: "Order now",
    privacy: "Your details are shared only with the seller.",
    currency: "DA",
  },
};