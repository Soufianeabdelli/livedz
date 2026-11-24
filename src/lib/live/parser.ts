/**
 * Parses live-stream comments for order intent.
 *
 * Algerian sellers use short product codes during lives.
 * Common patterns:
 *   "K1"  "k1"  "K 1"            → product code K1, qty 1
 *   "K1 x2"  "K1 ×2"  "2 K1"     → product code K1, qty 2
 *   "K1 L"  "K1 42"  "K1 L noir" → product code K1, size L/42, color noir
 *   "code 3"  "كود 3"  "كود3"     → product code `${codePrefix}3` (default K3)
 *   "أريد K1"  "بغيت K1"          → "I want K1"
 *   "K1 combien?"  "K1 شحال"      → question (NOT an order)
 */

import type { ParsedIntent } from "./types";

const EASTERN_ARABIC: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

/** Normalize full-width characters, Eastern-Arabic/Persian digits, and zero-width marks. */
export function normalizeDigits(s: string): string {
  return s
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/\u3000/g, " ")
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[٠-٩۰-۹]/g, (c) => EASTERN_ARABIC[c] ?? c);
}

const INTENT_PREFIX_RE =
  /^(?:أريد|اريد|بغيت|نبغي|نحب|حابب?|عطيني|اعطيني|ابعثلي|ابعث|ابعت|commander|je\s*veux|j['’]?veux)\s+/i;

const QUESTION_RE =
  /[?؟]|(?:^|\s)(?:combien|prix|tarif|livraison|dispo|disponible|tailles?|couleurs?|شحال|بشحال|بقداه|قداه|قداش|سعر|ثمن|السعر|التوصيل|كاين|متوفر|وين|الالوان|المقاسات)(?:\s|$)/i;

// Group 1+2: LETTER + optional space + DIGITS (e.g. K1, K 1, P12)
// Group 3: "code"/"cod"/"كود" + DIGITS (e.g. code 3, كود3)
const CODE_RE =
  /(?:([A-Za-z])\s*(\d{1,3})|(?:code|cod|كود)\s*(\d{1,3}))/i;

const QTY_AFTER_RE = /[x×*]\s*(\d{1,2})/i;
const QTY_BEFORE_RE = /(\d{1,2})\s*$/;

const SIZES = new Set([
  "xxs", "xs", "s", "m", "l", "xl", "xxl", "xxxl",
  "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "48", "50",
]);

const COLORS = new Set([
  "noir", "blanc", "bleu", "rouge", "vert", "gris", "rose", "jaune", "orange", "marron", "beige", "violet",
  "أسود", "اسود", "أبيض", "ابيض", "أزرق", "ازرق", "أحمر", "احمر", "أخضر", "اخضر", "رمادي", "وردي", "أصفر", "اصفر", "برتقالي", "بني", "بيج", "بنفسجي",
  "black", "white", "blue", "red", "green", "grey", "gray", "pink", "yellow", "brown",
]);

export type ParseOptions = {
  /** Prefix used when viewer types "code 3" / "كود 3" (defaults to "K") */
  codePrefix?: string;
  /** Actual variant sizes of the matched product, for disambiguating e.g. "K1 42" */
  knownSizes?: readonly string[];
  /** Actual variant colors of the matched product */
  knownColors?: readonly string[];
};

function sanitizePrefix(prefix?: string): string {
  const clean = (prefix ?? "K").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean || "K";
}

function matchCode(text: string, prefix: string): { productCode: string; index: number; length: number } | null {
  const m = CODE_RE.exec(text);
  if (!m) return null;
  const productCode = m[1] ? `${m[1]}${m[2]}`.toUpperCase() : `${prefix}${m[3]}`;
  return { productCode, index: m.index, length: m[0].length };
}

/**
 * Fast pre-extraction of the product code so the caller can fetch variant metadata
 * before calling `parseComment` with `knownSizes` / `knownColors`.
 */
export function extractProductCode(raw: string, codePrefix?: string): string | null {
  if (!raw || raw.length > 200) return null;
  const text = normalizeDigits(raw).trim().replace(INTENT_PREFIX_RE, "").trim();
  const hit = matchCode(text, sanitizePrefix(codePrefix));
  return hit?.productCode ?? null;
}

export function parseComment(raw: string, opts: ParseOptions = {}): ParsedIntent {
  if (!raw || raw.length > 200) return { match: false };

  const prefix = sanitizePrefix(opts.codePrefix);
  const normalized = normalizeDigits(raw).trim();
  if (!normalized) return { match: false };

  const text = normalized.replace(INTENT_PREFIX_RE, "").trim();
  if (!text) return { match: false };

  const hit = matchCode(text, prefix);

  // Question detection: never convert price/availability questions into orders
  if (QUESTION_RE.test(normalized)) {
    return { match: false, isQuestion: true, productCode: hit?.productCode };
  }

  if (!hit) return { match: false };

  const sizeSet = new Set([...SIZES, ...(opts.knownSizes ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean)]);
  const colorSet = new Set([...COLORS, ...(opts.knownColors ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean)]);

  // ── quantity ───────────────────────────────────────────────────────
  let quantity = 1;
  const afterCode = text.slice(hit.index + hit.length).trim();
  const qAfter = QTY_AFTER_RE.exec(afterCode);
  if (qAfter) {
    quantity = parseInt(qAfter[1], 10);
  } else {
    const before = text.slice(0, hit.index).trim();
    const qBefore = QTY_BEFORE_RE.exec(before);
    if (qBefore) quantity = parseInt(qBefore[1], 10);
  }
  if (quantity < 1 || quantity > 10) quantity = 1;

  // ── size / color ───────────────────────────────────────────────────
  const tokens = afterCode
    .replace(QTY_AFTER_RE, "")
    .split(/[\s,]+/)
    .filter(Boolean);

  let size: string | undefined;
  let color: string | undefined;
  for (const t of tokens) {
    const low = t.toLowerCase();
    if (!size && sizeSet.has(low)) size = t;
    else if (!color && colorSet.has(low)) color = t;
  }

  return { match: true, productCode: hit.productCode, quantity, size, color };
}
