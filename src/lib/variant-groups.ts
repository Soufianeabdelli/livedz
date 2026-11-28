export type VariantInput = { id: string; size: string; color: string; available: number };
export type SizeOption = { id: string; size: string; available: number };
export type ColorGroup = { color: string; sizes: SizeOption[]; available: number };
export type Grouped = { colors: ColorGroup[]; hasColor: boolean; hasSize: boolean };

const LETTERS = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL"];

// Numbers first (9 before 10), then clothing letters (S, M, L, XL), then anything else
export function compareSizes(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  const aNum = a.trim() !== "" && Number.isFinite(na);
  const bNum = b.trim() !== "" && Number.isFinite(nb);
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  const ia = LETTERS.indexOf(a.trim().toUpperCase());
  const ib = LETTERS.indexOf(b.trim().toUpperCase());
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return a.localeCompare(b);
}

export function groupVariants(variants: VariantInput[]): Grouped {
  const map = new Map<string, SizeOption[]>();
  for (const v of variants) {
    const list = map.get(v.color) ?? [];
    list.push({ id: v.id, size: v.size, available: Math.max(0, v.available) });
    map.set(v.color, list);
  }
  const colors: ColorGroup[] = [];
  for (const [color, sizes] of map) {
    sizes.sort((x, y) => compareSizes(x.size, y.size));
    colors.push({ color, sizes, available: sizes.reduce((s, o) => s + o.available, 0) });
  }
  return {
    colors,
    hasColor: variants.some((v) => v.color !== ""),
    hasSize: variants.some((v) => v.size !== ""),
  };
}

export function resolveVariant(colors: ColorGroup[], color: string, size: string): SizeOption | null {
  const group = colors.find((c) => c.color === color);
  return group?.sizes.find((s) => s.size === size) ?? null;
}