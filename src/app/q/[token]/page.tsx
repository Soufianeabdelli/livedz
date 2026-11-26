import { Suspense, type CSSProperties } from "react";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readableTextOn } from "@/lib/color";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { resolveLocale } from "@/lib/locale-cookie";
import { CARD_TOKEN_RE } from "@/lib/token";
import { OrderForm } from "./order-form";

type Props = { params: Promise<{ token: string }> };

const DEFAULT_ACCENT = "#4F5842";
const ALLOWED_ACCENTS = new Set(["#4f5842", "#7a4e2d", "#2f2a26", "#2c4a52"]);

function safeAccentStyle(hex?: string | null): CSSProperties {
  const accent = hex && ALLOWED_ACCENTS.has(hex.toLowerCase()) ? hex : DEFAULT_ACCENT;
  const accentInk = readableTextOn(accent);
  return { "--accent": accent, "--accent-ink": accentInk } as CSSProperties;
}

export default function Page({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
          <p className="text-sm text-muted">Loading PinCasting...</p>
        </div>
      }
    >
      <CardView params={params} />
    </Suspense>
  );
}

const fmt = new Intl.NumberFormat("fr-DZ");

async function CardView({ params }: Props) {
  const { token } = await params;
  if (!CARD_TOKEN_RE.test(token)) notFound();

  const card = await prisma.card.findUnique({
    where: { token },
    include: {
      merchant: {
        select: {
          name: true,
          slug: true,
          deliveryRates: { select: { wilayaCode: true, homeDzd: true, stopdeskDzd: true } },
        },
      },
      product: { include: { variants: { orderBy: { size: "asc" } } } },
    },
  });
  if (!card?.isActive || !card.product?.isActive) notFound();

  const profile = await prisma.storeProfile.findUnique({
    where: { merchantId: card.merchantId },
    select: { displayName: true, tagline: true, accentColor: true, city: true, category: true },
  });

  const { name: productTitle, code: productCode, priceDzd, variants: rawVariants } = card.product;
  const { name: merchantFallback, slug: merchantSlug, deliveryRates } = card.merchant;

  const totalAvailable = rawVariants.reduce((sum, v) => sum + Math.max(0, v.stock - v.reserved), 0);
  const variants = Array.from(rawVariants, (v) => ({
    id: v.id,
    label: v.color ? `${v.size} - ${v.color}` : v.size,
    available: v.stock - v.reserved > 0,
  }));

  const storeName = profile?.displayName?.trim() || merchantFallback;
  const categoryLabel = profile?.category ?? "PRODUCT";
  const initialLocale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const idempotencyKey = randomUUID();

  return (
    <div style={safeAccentStyle(profile?.accentColor)} className="min-h-screen bg-surface text-ink flex flex-col">
      {/* Sticky PinCasting Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/go" className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
                <circle cx="12" cy="11" r="2.2" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block font-serif text-lg font-semibold tracking-tight text-ink">PinCasting</span>
              <span className="hidden sm:block text-[11px] font-medium text-muted">TikTok Live QR &amp; Instant Checkout</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 rounded-full border border-line bg-soft p-1 text-xs font-medium">
            <Link href={`/overlay/${merchantSlug}`} className="rounded-full px-3 py-1.5 text-muted transition hover:text-ink">
              Live Overlay
            </Link>
            <Link href="/go" className="rounded-full bg-card px-3 py-1.5 text-ink shadow-sm">
              15s Checkout
            </Link>
            <Link href="/dashboard" className="rounded-full px-3 py-1.5 text-muted transition hover:text-ink">
              Merchant Desk
            </Link>
          </nav>
        </div>
      </header>

      {/* Main 2-Column Editorial Layout */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Mobile-First 15s Checkout Card */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-[440px] overflow-hidden rounded-[2rem] border border-line bg-card shadow-[var(--shadow-card)]">
              {/* Simulated In-App Browser Bar */}
              <div className="flex items-center justify-between border-b border-line bg-soft px-5 py-3 text-xs">
                <span className="font-medium text-muted">pincasting.app/#{productCode}</span>
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                  15s Checkout
                </span>
              </div>

              {/* 4:3 Editorial Hero Banner (ready for Product.imageUrl in Phase B) */}
              <div
                className="relative aspect-[4/3] w-full overflow-hidden flex flex-col justify-between p-5"
                style={{
                  background: "linear-gradient(135deg, #E8E3D8 0%, #D9D3C4 52%, #C9C3B2 100%)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-ink backdrop-blur-md shadow-sm">
                    {categoryLabel} · #{productCode}
                  </span>
                  <span className="rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-accent backdrop-blur-md shadow-sm">
                    {totalAvailable > 0 ? `${totalAvailable} available` : "Out of stock"}
                  </span>
                </div>

                <div className="my-auto flex flex-col items-center text-center px-4">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-card/85 text-accent shadow-sm">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                      <path d="M3 6h18" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                  <p className="font-serif text-2xl font-semibold text-ink">{productTitle}</p>
                  <p className="mt-1 text-xs font-medium text-muted">{storeName}{profile?.city ? ` · ${profile.city}` : ""}</p>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="rounded-full bg-card/90 px-3 py-1 font-semibold text-ink shadow-sm">
                    {fmt.format(priceDzd)} DA
                  </span>
                  <span className="rounded-full bg-card/90 px-3 py-1 font-medium text-muted shadow-sm">
                    Verified Store
                  </span>
                </div>
              </div>

              {/* Product Meta + Order Form */}
              <div className="p-5 sm:p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">{storeName}</span>
                    {profile?.city && <span className="text-xs text-muted">{profile.city}</span>}
                  </div>
                  <h1 className="font-serif text-2xl font-semibold mt-1 leading-snug text-ink">{productTitle}</h1>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-xl font-bold text-ink">{fmt.format(priceDzd)} DA</span>
                    <span className="text-xs text-muted">Cash on delivery</span>
                  </div>
                  {profile?.tagline && <p className="mt-2 text-xs leading-relaxed text-muted">{profile.tagline}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2 border-y border-line py-3 text-center text-[11px] font-medium text-muted">
                  <div>69 Wilayas</div>
                  <div>Pay on Delivery</div>
                  <div>Fast Confirm</div>
                </div>

                <OrderForm
                  token={token}
                  idempotencyKey={idempotencyKey}
                  variants={variants}
                  deliveryRates={deliveryRates}
                  priceDzd={priceDzd}
                  initialLocale={initialLocale}
                />
              </div>
            </div>
          </div>

          {/* Right: PinCasting Buyer Trust & How It Works Panel */}
          <aside className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
              <h2 className="font-serif text-xl font-semibold text-ink">Fast &amp; Verified Live Checkout</h2>
              <ul className="mt-4 space-y-3.5 text-sm text-muted">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">1</span>
                  <span><strong className="text-ink">Zero account needed:</strong> Complete your order directly from the live QR or code <span className="font-mono font-semibold text-ink">#{productCode}</span>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">2</span>
                  <span><strong className="text-ink">Arabic, French &amp; English:</strong> Switch languages anytime—phone numbers accept Eastern Arabic and Persian digits automatically.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">3</span>
                  <span><strong className="text-ink">69-Wilaya delivery:</strong> All 69 official Algerian wilayas supported with automatic courier routing.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">4</span>
                  <span><strong className="text-ink">Seller confirms first:</strong> {storeName} verifies your details before shipping—you pay only upon delivery.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">Shareable Offer Code</div>
              <div className="mt-2 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
                <div>
                  <div className="font-mono text-base font-bold text-ink">#{productCode}</div>
                  <div className="text-xs text-muted">Enter on PinCasting Quick Code (/go)</div>
                </div>
                <Link href="/go" className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-ink transition hover:opacity-95">
                  Try /go
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
