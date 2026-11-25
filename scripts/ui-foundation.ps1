if (-not (Test-Path (Join-Path $PWD "package.json"))) { throw "Run this from the livedz project root" }
$utf8 = New-Object System.Text.UTF8Encoding $false

function Write-New($path, $content) {
  $full = Join-Path $PWD $path
  if ((Test-Path -LiteralPath $full) -and ((Get-Item -LiteralPath $full).Length -gt 0)) { "SKIP (exists): $path"; return }
  New-Item -ItemType Directory -Force -Path (Split-Path $full) | Out-Null
  [System.IO.File]::WriteAllText($full, $content, $utf8)
  "WROTE: $path"
}

Write-New 'src\app\tokens.css' @'
/* Design tokens. Storefront pages override --accent / --accent-ink per store. */
@theme {
  --color-surface: #fbfaf8;
  --color-card: #ffffff;
  --color-ink: #1c1917;
  --color-muted: #6b6560;
  --color-line: #e8e4de;
  --color-success: #15803d;
  --color-danger: #b91c1c;
  --radius-card: 1.25rem;
  --radius-control: 0.875rem;
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.06);
  --shadow-sheet: 0 -8px 32px rgb(0 0 0 / 0.12);
}

@theme inline {
  --color-accent: var(--accent, #8b5e3c);
  --color-accent-ink: var(--accent-ink, #ffffff);
}
'@

Write-New 'src\lib\color.ts' @'
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
'@

Write-New 'src\lib\color.test.ts' @'
import { describe, it, expect } from "vitest";
import { contrastRatio, readableTextOn } from "./color";

describe("color helpers", () => {
  it("black on white is about 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("uses white text on a dark purple accent", () => {
    expect(readableTextOn("#5b1a8f")).toBe("#ffffff");
  });

  it("uses dark text on a light yellow accent", () => {
    expect(readableTextOn("#ffd400")).toBe("#111111");
  });

  it("accepts 3-digit hex and a missing #", () => {
    expect(readableTextOn("#fff")).toBe("#111111");
    expect(readableTextOn("000000")).toBe("#ffffff");
  });

  it("throws RangeError on invalid input", () => {
    expect(() => readableTextOn("purple")).toThrow(RangeError);
    expect(() => readableTextOn("#12345")).toThrow(RangeError);
  });
});
'@

Write-New 'src\lib\countries\types.ts' @'
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
'@

Write-New 'src\lib\countries\packs.ts' @'
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
'@

Write-New 'src\lib\countries\packs.test.ts' @'
import { describe, it, expect } from "vitest";
import { getCountryPack, isRtl, formatMoney } from "./packs";

describe("country packs", () => {
  it("finds Algeria case-insensitively", () => {
    expect(getCountryPack("dz")?.currency).toBe("DZD");
  });

  it("returns undefined for an unknown country", () => {
    expect(getCountryPack("ZZ")).toBeUndefined();
  });

  it("treats Arabic as RTL and French as LTR", () => {
    const dz = getCountryPack("DZ")!;
    expect(isRtl(dz, "ar")).toBe(true);
    expect(isRtl(dz, "fr")).toBe(false);
  });

  it("formats DZD without decimals", () => {
    const dz = getCountryPack("DZ")!;
    const text = formatMoney(3500, dz, "fr").replace(/\s/g, " ");
    expect(text).toContain("3 500");
    expect(text).toMatch(/DA|DZD/);
    expect(text).not.toMatch(/[.,]\d{2}\b/);
  });

  it("rejects non-finite amounts", () => {
    expect(() => formatMoney(Number.NaN, getCountryPack("DZ")!)).toThrow(RangeError);
  });
});
'@

# Hook tokens into globals.css once
$cssPath = Join-Path $PWD 'src\app\globals.css'
$css = [System.IO.File]::ReadAllText($cssPath)
if ($css -notmatch 'tokens\.css') {
  $css = $css.Replace('@import "tailwindcss";', "@import `"tailwindcss`";`n@import `"./tokens.css`";")
  [System.IO.File]::WriteAllText($cssPath, $css, $utf8)
  "UPDATED: globals.css"
} else { "globals.css already imports tokens.css" }