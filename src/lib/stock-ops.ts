// src/lib/stock-ops.ts
// Strict stock operations. Each one changes exactly one row or throws, so a
// surrounding transaction rolls back instead of silently corrupting counts.

export type StockItem = { variantId: string; quantity: number };

type SqlTx = {
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): PromiseLike<number>;
};

export class StockInvariantError extends Error {
  op: "release" | "commit" | "restore";
  variantId: string;
  quantity: number;

  constructor(op: "release" | "commit" | "restore", variantId: string, quantity: number) {
    super(`stock ${op} failed for variant ${variantId} (qty ${quantity}): row missing or not enough reserved stock`);
    this.name = "StockInvariantError";
    this.op = op;
    this.variantId = variantId;
    this.quantity = quantity;
  }
}

function prepare(items: StockItem[]): StockItem[] {
  for (const it of items) {
    if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
      throw new RangeError(`quantity must be a positive integer (variant ${it.variantId})`);
    }
  }
  // Fixed lock order avoids deadlocks between concurrent transactions.
  return [...items].sort((a, b) => (a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0));
}

/** Cancel / expire: give reserved units back. Throws if reserved < quantity. */
export async function releaseReserved(tx: SqlTx, items: StockItem[]): Promise<void> {
  for (const it of prepare(items)) {
    const n = await tx.$executeRaw`UPDATE "Variant" SET "reserved" = "reserved" - ${it.quantity}::int
      WHERE "id" = ${it.variantId} AND "reserved" >= ${it.quantity}::int`;
    if (n !== 1) throw new StockInvariantError("release", it.variantId, it.quantity);
  }
}

/** Shipped: stock and reserved drop together in ONE statement. Throws if reserved < quantity. */
export async function commitReserved(tx: SqlTx, items: StockItem[]): Promise<void> {
  for (const it of prepare(items)) {
    const n = await tx.$executeRaw`UPDATE "Variant"
      SET "stock" = "stock" - ${it.quantity}::int, "reserved" = "reserved" - ${it.quantity}::int
      WHERE "id" = ${it.variantId} AND "reserved" >= ${it.quantity}::int AND "stock" >= ${it.quantity}::int`;
    if (n !== 1) throw new StockInvariantError("commit", it.variantId, it.quantity);
  }
}

/** Returned parcel: units go back into stock. Throws if the variant no longer exists. */
export async function restoreStock(tx: SqlTx, items: StockItem[]): Promise<void> {
  for (const it of prepare(items)) {
    const n = await tx.$executeRaw`UPDATE "Variant" SET "stock" = "stock" + ${it.quantity}::int
      WHERE "id" = ${it.variantId}`;
    if (n !== 1) throw new StockInvariantError("restore", it.variantId, it.quantity);
  }
}