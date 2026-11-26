// src/lib/color.ts

function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new RangeError(`invalid hex color: ${hex}`);
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Dark or white text, whichever reads better on the given background. */
export function readableTextOn(background: string): "#111111" | "#ffffff" {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#111111")
    ? "#ffffff"
    : "#111111";
}

export const DEFAULT_ACCENT = "#4F5842";

export const ACCENT_PRESETS = [
  { hex: "#4F5842", label: "Sage Editorial" },
  { hex: "#7A4E2D", label: "Warm Clay" },
  { hex: "#2F2A26", label: "Espresso" },
  { hex: "#2C4A52", label: "Mediterranean Slate" },
] as const;

const ALLOWED_ACCENTS = new Set<string>(Array.from(ACCENT_PRESETS, (p) => p.hex.toLowerCase()));

export function safeAccentHex(hex?: string | null): string {
  return hex && ALLOWED_ACCENTS.has(hex.toLowerCase()) ? hex : DEFAULT_ACCENT;
}
