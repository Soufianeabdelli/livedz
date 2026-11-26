export const LOCALES = ["ar", "en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "livedz_lang";

export type ProfileType = "SELLER" | "SERVICE" | "AFFILIATE" | "ECOMMERCE";

export type Dict = {
  title: string;
  subtitle: string;
  language: string;
  name: string;
  tagline: string;
  taglinePlaceholder: string;
  profileType: string;
  city: string;
  whatsapp: string;
  accentColor: string;
  save: string;
  saving: string;
  saved: string;
  types: Record<ProfileType, string>;
};

export const DICT: Record<Locale, Dict> = {
  en: {
    title: "Store profile",
    subtitle: "This is how buyers will see your business.",
    language: "Language",
    name: "Store or business name",
    tagline: "Tagline",
    taglinePlaceholder: "A short line buyers will remember",
    profileType: "Profile type",
    city: "City",
    whatsapp: "WhatsApp number",
    accentColor: "Accent color",
    save: "Save profile",
    saving: "Saving...",
    saved: "Profile saved.",
    types: { SELLER: "Seller", SERVICE: "Service provider", AFFILIATE: "Affiliate", ECOMMERCE: "E-commerce store" },
  },
  fr: {
    title: "Profil de la boutique",
    subtitle: "Voici comment les acheteurs verront votre activité.",
    language: "Langue",
    name: "Nom de la boutique ou de l'entreprise",
    tagline: "Slogan",
    taglinePlaceholder: "Une phrase courte que les acheteurs retiendront",
    profileType: "Type de profil",
    city: "Ville",
    whatsapp: "Numéro WhatsApp",
    accentColor: "Couleur d'accent",
    save: "Enregistrer le profil",
    saving: "Enregistrement...",
    saved: "Profil enregistré.",
    types: { SELLER: "Vendeur", SERVICE: "Prestataire de services", AFFILIATE: "Affilié", ECOMMERCE: "Boutique en ligne" },
  },
  ar: {
    title: "ملف المتجر",
    subtitle: "هكذا سيرى المشترون نشاطك التجاري.",
    language: "اللغة",
    name: "اسم المتجر أو النشاط التجاري",
    tagline: "الشعار",
    taglinePlaceholder: "عبارة قصيرة يتذكرها المشترون",
    profileType: "نوع الملف",
    city: "المدينة",
    whatsapp: "رقم واتساب",
    accentColor: "اللون المميز",
    save: "حفظ الملف",
    saving: "جارٍ الحفظ...",
    saved: "تم حفظ الملف.",
    types: { SELLER: "بائع", SERVICE: "مزود خدمة", AFFILIATE: "مسوّق بالعمولة", ECOMMERCE: "متجر إلكتروني" },
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export type OrderFormDict = {
  customerName: string;
  phone: string;
  wilaya: string;
  commune: string;
  stopdesk: string;
  home: string;
  delivery: string;
  address: string;
  addressPlaceholder: string;
  consent: string;
  submitting: string;
  submit: string;
};

export const ORDER_FORM_DICT: Record<Locale, OrderFormDict> = {
  en: {
    customerName: "Full name",
    phone: "Phone (05 50 12 34 56)",
    wilaya: "Wilaya",
    commune: "Commune",
    stopdesk: "Stopdesk",
    home: "Home delivery",
    delivery: "Delivery",
    address: "Client address",
    addressPlaceholder: "Full delivery address (street, building, landmark)",
    consent: "Yes, send me WhatsApp updates about my order.",
    submitting: "Sending...",
    submit: "Order now (Cash on delivery)",
  },
  fr: {
    customerName: "Nom complet",
    phone: "Téléphone (05 50 12 34 56)",
    wilaya: "Wilaya",
    commune: "Commune",
    stopdesk: "Bureau",
    home: "Domicile",
    delivery: "Livraison",
    address: "Adresse du client",
    addressPlaceholder: "Adresse complète (rue, bâtiment, repère)",
    consent: "Oui, envoyez-moi des messages WhatsApp sur ma commande.",
    submitting: "Envoi...",
    submit: "Commander (paiement à la livraison)",
  },
  ar: {
    customerName: "الاسم الكامل",
    phone: "رقم الهاتف (05 50 12 34 56)",
    wilaya: "الولاية",
    commune: "البلدية",
    stopdesk: "مكتب التوصيل",
    home: "التوصيل للمنزل",
    delivery: "التوصيل",
    address: "عنوان العميل",
    addressPlaceholder: "العنوان الكامل (الشارع، العمارة، معلم قريب)",
    consent: "نعم، أرسلوا لي تحديثات طلبي عبر واتساب.",
    submitting: "جاري الإرسال...",
    submit: "تأكيد الطلب (الدفع عند الاستلام)",
  },
};
