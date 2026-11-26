import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readableTextOn } from "@/lib/color";
import { prisma } from "@/lib/db";
import { dedupeByOffer } from "@/lib/offer-dedupe";

type Props = { params: Promise<{ slug: string }> };

const fmt = new Intl.NumberFormat("fr-DZ");
const ALLOWED_ACCENTS = new Set(["#4f5842", "#7a4e2d", "#2f2a26", "#2c4a52"]);

export default function BioLinkPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <p className="text-sm text-muted">Loading store...</p>
        </div>
      }
    >
      <NowShowingView params={params} />
    </Suspense>
  );
}

async function NowShowingView({ params }: Props) {
  const { slug } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      activeCardId: true,
      liveSessions: {
        where: { status: "RUNNING" },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!merchant) notFound();

  const [profile, rawCards] = await Promise.all([
    prisma.storeProfile.findUnique({
      where: { merchantId: merchant.id },
      select: { displayName: true, tagline: true, accentColor: true, city: true },
    }),
    prisma.card.findMany({
      where: { merchantId: merchant.id, isActive: true, product: { isActive: true } },
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
  ]);

  const cards = dedupeByOffer(rawCards).filter(
    (c): c is typeof c & { product: NonNullable<typeof c.product> } => c.product !== null,
  );
  if (cards.length === 0) notFound();

  const activeIdx = merchant.activeCardId
    ? Math.max(0, cards.findIndex((c) => c.id === merchant.activeCardId))
    : 0;
  const featured = cards[activeIdx] ?? cards[0];
  const others = cards.filter((c) => c.id !== featured.id);

  const isLive = merchant.liveSessions.length > 0;
  const { name: fallbackMerchant } = merchant;
  const storeName = profile?.displayName?.trim() || fallbackMerchant;
  const rawAccent = profile?.accentColor;
  const accent = rawAccent && ALLOWED_ACCENTS.has(rawAccent.toLowerCase()) ? rawAccent : "#4F5842";
  const style = { "--accent": accent, "--accent-ink": readableTextOn(accent) } as CSSProperties;

  const { code: featCode, name: featTitle, priceDzd: featPrice, variants: featVariants } = featured.product;
  let featAvailable = 0;
  for (const v of featVariants) featAvailable += Math.max(0, v.stock - v.reserved);

  return (
    <div style={style} className="min-h-screen bg-surface px-4 py-6 sm:py-10 text-ink">
      <main className="mx-auto w-full max-w-md space-y-5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <h1 className="font-serif text-xl font-semibold text-ink">{storeName}</h1>
            {profile?.city && <p className="text-xs text-muted">{profile.city}</p>}
          </div>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              LIVE now
            </span>
          ) : (
            <span className="rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-muted">
              Open for orders
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]">
          <div
            className="aspect-[4/3] w-full p-5 flex flex-col justify-between"
            style={{ background: "linear-gradient(135deg, #E8E3D8 0%, #D9D3C4 52%, #C9C3B2 100%)" }}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-card/90 px-3 py-1 font-mono text-xs font-bold text-ink">
                #{featCode}
              </span>
              <span className="rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-accent">
                {featAvailable > 0 ? `${featAvailable} left` : "Sold out"}
              </span>
            </div>
            <div className="my-auto text-center px-3">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                {isLive ? "Now Showing" : "Featured Offer"}
              </div>
              <div className="mt-1 font-serif text-2xl font-semibold text-ink">{featTitle}</div>
            </div>
            <div className="text-center">
              <span className="rounded-full bg-card/90 px-3.5 py-1 text-sm font-bold text-ink">
                {fmt.format(featPrice)} DA
              </span>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {!isLive && (
              <p className="text-xs text-muted">Live ended — you can still order anytime.</p>
            )}
            <Link
              href={`/q/${featured.token}`}
              className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink shadow-sm transition hover:opacity-95"
            >
              {featAvailable > 0 ? "Order now" : "View offer"}
            </Link>
          </div>
        </div>

        {others.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Also in this live
            </h2>
            <div className="space-y-2">
              {Array.from(others, (c) => {
                const { code: oCode, name: oTitle, priceDzd: oPrice } = c.product;
                return (
                  <Link
                    key={c.id}
                    href={`/q/${c.token}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 transition hover:border-accent"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-accent">#{oCode}</div>
                      <div className="truncate text-sm font-semibold text-ink">{oTitle}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold text-ink">{fmt.format(oPrice)} DA</div>
                      <div className="text-[11px] text-muted">Order →</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <footer className="pt-2 text-center text-[11px] text-muted">
          Powered by <span className="font-semibold text-ink">PinCasting</span>
        </footer>
      </main>
    </div>
  );
}
