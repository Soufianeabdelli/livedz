import type { Locale } from "./i18n";

export type PageDict = {
  size: string;
  color: string;
  chooseSize: string;
  chooseColor: string;
  soldOut: string;
  onlyLeft: string;
  codeLabel: string;
  codeOpen: string;
  codeNotFound: string;
  deliveryTbd: string;
  quantity: string;
  submitting: string;
  noOffers: string;
  liveNow: string;
  successTitle: string;
  successRef: string;
  successNext: string;
  errRateLimited: string;
  errInvalidInput: string;
  errOutOfStock: string;
  errCardNotFound: string;
  errChooseOption: string;
  errServer: string;
};

// Arabic is written as unicode escapes so this file stays plain ASCII
export const PAGE_DICT: Record<Locale, PageDict> = {
  ar: {
    size: "\u0627\u0644\u0645\u0642\u0627\u0633",
    color: "\u0627\u0644\u0644\u0648\u0646",
    chooseSize: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u0642\u0627\u0633",
    chooseColor: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0644\u0648\u0646",
    soldOut: "\u0646\u0641\u0630\u062A \u0627\u0644\u0643\u0645\u064A\u0629",
    onlyLeft: "\u0628\u0642\u064A {n} \u0641\u0642\u0637",
    codeLabel: "\u0623\u062F\u062E\u0644 \u0631\u0645\u0632 \u0627\u0644\u0645\u0646\u062A\u062C",
    codeOpen: "\u0627\u0641\u062A\u062D",
    codeNotFound: "\u0627\u0644\u0631\u0645\u0632 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F",
    deliveryTbd: "\u0633\u0639\u0631 \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u064A\u0624\u0643\u062F\u0647 \u0627\u0644\u0628\u0627\u0626\u0639",
    quantity: "\u0627\u0644\u0643\u0645\u064A\u0629",
    submitting: "\u062C\u0627\u0631\u064A \u0627\u0644\u0625\u0631\u0633\u0627\u0644",
    noOffers: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0631\u0648\u0636 \u062D\u0627\u0644\u064A\u0627",
    liveNow: "\u0645\u0628\u0627\u0634\u0631 \u0627\u0644\u0622\u0646",
    successTitle: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628\u0643",
    successRef: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628",
    successNext: "\u0633\u064A\u062A\u0635\u0644 \u0628\u0643 \u0627\u0644\u0628\u0627\u0626\u0639 \u0644\u0644\u062A\u0623\u0643\u064A\u062F",
    errRateLimited: "\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0643\u062B\u064A\u0631\u0629. \u062D\u0627\u0648\u0644 \u0644\u0627\u062D\u0642\u0627",
    errInvalidInput: "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u062D\u0645\u0631\u0627\u0621",
    errOutOfStock: "\u0647\u0630\u0627 \u0627\u0644\u062E\u064A\u0627\u0631 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631",
    errCardNotFound: "\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0644\u0645 \u064A\u0639\u062F \u0641\u0639\u0627\u0644\u0627",
    errChooseOption: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u0642\u0627\u0633",
    errServer: "\u062E\u0637\u0623 \u062A\u0642\u0646\u064A. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649",
  },
  fr: {
    size: "Taille",
    color: "Couleur",
    chooseSize: "Choisir la taille",
    chooseColor: "Choisir la couleur",
    soldOut: "\u00C9puis\u00E9",
    onlyLeft: "Plus que {n}",
    codeLabel: "Entrez le code du produit",
    codeOpen: "Ouvrir",
    codeNotFound: "Code introuvable",
    deliveryTbd: "Prix de livraison confirm\u00E9 par le vendeur",
    quantity: "Quantit\u00E9",
    submitting: "Envoi",
    noOffers: "Aucune offre pour le moment",
    liveNow: "En direct",
    successTitle: "Commande re\u00E7ue",
    successRef: "R\u00E9f\u00E9rence",
    successNext: "Le vendeur va vous appeler pour confirmer.",
    errRateLimited: "Trop de tentatives. R\u00E9essayez plus tard.",
    errInvalidInput: "V\u00E9rifiez les champs en rouge.",
    errOutOfStock: "Cette option n'est plus disponible.",
    errCardNotFound: "Ce lien n'est plus actif.",
    errChooseOption: "Choisissez une taille.",
    errServer: "Erreur technique. R\u00E9essayez.",
  },
  en: {
    size: "Size",
    color: "Color",
    chooseSize: "Choose a size",
    chooseColor: "Choose a color",
    soldOut: "Sold out",
    onlyLeft: "Only {n} left",
    codeLabel: "Enter the product code",
    codeOpen: "Open",
    codeNotFound: "Code not found",
    deliveryTbd: "Delivery price confirmed by the seller",
    quantity: "Quantity",
    submitting: "Sending",
    noOffers: "No offers right now",
    liveNow: "Live now",
    successTitle: "Order received",
    successRef: "Reference",
    successNext: "The seller will call you to confirm.",
    errRateLimited: "Too many attempts. Try again later.",
    errInvalidInput: "Check the fields in red.",
    errOutOfStock: "This option is no longer available.",
    errCardNotFound: "This link is no longer active.",
    errChooseOption: "Choose a size.",
    errServer: "Technical error. Try again.",
  },
};

export function fill(text: string, n: number): string {
  return text.replace("{n}", String(n));
}