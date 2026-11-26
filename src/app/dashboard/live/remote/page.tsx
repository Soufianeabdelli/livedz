import { Suspense } from "react";
import Link from "next/link";
import { requireMerchant } from "@/lib/require-merchant";
import { prisma } from "@/lib/db";
import { dedupeByOffer } from "@/lib/offer-dedupe";
import { resolveOverlayPlatform } from "@/lib/overlay-platform";
import { getRecentRemoteCounts } from "@/lib/overlay-state";
import { RemoteClient, type RemoteItem } from "./remote-client";

export default function HostRemotePage() {
  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-ink">
      <div className="mx-auto mb-4 flex w-full max-w-md items-center justify-between">
        <Link href="/dashboard/live" className="text-xs font-semibold text-muted hover:text-ink">
          ← Live Sessions
        </Link>
        <span className="font-serif text-base font-semibold text-ink">Host Remote</span>
        <Link href="/dashboard" className="text-xs font-semibold text-accent hover:underline">
          Orders
        </Link>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-muted">Loading remote...</p>}>
        <RemoteContent />
      </Suspense>
    </div>
  );
}

async function RemoteContent() {
  const merchantId = await requireMerchant();
  const [merchant, rawCards, { ordersCount, interestedCount }] = await Promise.all([
    prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { slug: true, activeCardId: true, overlayPlatform: true, overlayHidden: true },
    }),
    prisma.card.findMany({
      where: { merchantId, isActive: true, product: { isActive: true } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        token: true,
        merchantId: true,
        productId: true,
        affiliateId: true,
        product: {
          select: {
            code: true,
            name: true,
            priceDzd: true,
            variants: { select: { stock: true, reserved: true } },
          },
        },
      },
    }),
    getRecentRemoteCounts(merchantId),
  ]);

  const cards = dedupeByOffer(rawCards).filter(
    (c): c is typeof c & { product: NonNullable<typeof c.product> } => c.product !== null,
  );

  const items: RemoteItem[] = Array.from(cards, (c) => {
    const { code, name: title, priceDzd, variants } = c.product;
    const available = variants.reduce((sum, v) => sum + Math.max(0, v.stock - v.reserved), 0);
    return { cardId: c.id, code, title, priceDzd, available };
  });

  return (
    <RemoteClient
      slug={merchant.slug}
      items={items}
      initialActiveCardId={merchant.activeCardId}
      initialPlatform={resolveOverlayPlatform(merchant.overlayPlatform)}
      initialHidden={merchant.overlayHidden}
      ordersCount={ordersCount}
      interestedCount={interestedCount}
    />
  );
}
