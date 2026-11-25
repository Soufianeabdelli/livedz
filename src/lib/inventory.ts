// src/lib/inventory.ts

export type VariantStock = {
  variantId: string;
  sku: string;
  onHand: number;
  reserved: number;
};

export type VariantAvailability = VariantStock & {
  available: number;
};

/**
 * Builds a display SKU from product code, size and color.
 * Falls back to "STD" for empty segments so SKUs are always sortable/unique strings.
 */
export function buildSku(productCode: string, size?: string | null, color?: string | null): string {
  return `${productCode}-${size || "STD"}-${color || "STD"}`;
}

function assertNonNegativeInt(value: number, field: string, sku: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative integer for SKU ${sku}`);
  }
}

export type OversellWarning = {
  sku: string;
  onHand: number;
  reserved: number;
  deficit: number;
};

/**
 * Computes sellable units per variant.
 * - Validates that onHand and reserved are non-negative integers.
 * - Clamps available at 0 (reserved > onHand never yields negative stock).
 * - Collects oversell warnings when reserved exceeds onHand.
 * - Preserves input order.
 */
export function computeAvailability(
  rows: VariantStock[],
): { items: VariantAvailability[]; warnings: OversellWarning[] } {
  const warnings: OversellWarning[] = [];
  const items = rows.map((row) => {
    assertNonNegativeInt(row.onHand, "onHand", row.sku);
    assertNonNegativeInt(row.reserved, "reserved", row.sku);
    if (row.reserved > row.onHand) {
      warnings.push({
        sku: row.sku,
        onHand: row.onHand,
        reserved: row.reserved,
        deficit: row.reserved - row.onHand,
      });
    }
    return { ...row, available: Math.max(0, row.onHand - row.reserved) };
  });
  return { items, warnings };
}