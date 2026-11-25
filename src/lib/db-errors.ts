// src/lib/db-errors.ts

const PG_CHECK_VIOLATION = "23514";
const PRISMA_CONSTRAINT_FAILED = "P2004";
const STOCK_CONSTRAINTS = /variant_(stock_nonneg|reserved_nonneg|reserved_le_stock)/;

function mentionsStockConstraint(value: unknown): boolean {
  if (typeof value === "string") return STOCK_CONSTRAINTS.test(value);
  if (value && typeof value === "object") {
    try {
      return STOCK_CONSTRAINTS.test(JSON.stringify(value));
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * True when an error came from the Variant stock CHECK constraints
 * (stock >= 0, reserved >= 0, reserved <= stock). Walks the cause chain.
 */
export function isStockCheckViolation(err: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = err;

  for (let depth = 0; depth < 6; depth++) {
    if (!current || typeof current !== "object" || seen.has(current)) return false;
    seen.add(current);

    const e = current as { code?: unknown; message?: unknown; meta?: unknown; cause?: unknown };

    if (e.code === PG_CHECK_VIOLATION) return true;
    if (e.code === PRISMA_CONSTRAINT_FAILED && mentionsStockConstraint(e.meta ?? e.message)) return true;
    if (mentionsStockConstraint(e.message) || mentionsStockConstraint(e.meta)) return true;

    current = e.cause;
  }
  return false;
}