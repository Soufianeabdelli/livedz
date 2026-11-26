export type OfferCandidate = {
  token: string;
  merchantId: string;
  productId: string | null;
  affiliateId: string | null;
};

/**
 * Keeps one card per (merchantId, productId), preferring the store's primary
 * non-affiliate card (affiliateId === null) when both exist.
 */
export function dedupeByOffer<T extends OfferCandidate>(cards: T[]): T[] {
  const byOffer = new Map<string, T>();
  for (const c of cards) {
    if (!c.productId) continue;
    const key = `${c.merchantId}:${c.productId}`;
    const prev = byOffer.get(key);
    if (!prev || (prev.affiliateId !== null && c.affiliateId === null)) {
      byOffer.set(key, c);
    }
  }
  return [...byOffer.values()];
}
