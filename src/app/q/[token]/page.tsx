import { Suspense, type CSSProperties } from "react";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { readableTextOn } from "@/lib/color";
import { prisma } from "@/lib/db";
import { CARD_TOKEN_RE } from "@/lib/token";
import { OrderForm } from "./order-form";

type Props = { params: Promise<{ token: string }> };

const DEFAULT_ACCENT = "#4F5842";

function safeAccentStyle(hex?: string | null): CSSProperties {
  const accent = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_ACCENT;
  const accentInk = readableTextOn(accent);
  return { "--accent": accent, "--accent-ink": accentInk } as CSSProperties;
}

export default function Page({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
          <p className="text-sm text-muted">Loading...</p>
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
          deliveryRates: { select: { wilayaCode: true, homeDzd: true, stopdeskDzd: true } },
        },
      },
      product: { include: { variants: { orderBy: { size: "asc" } } } },
    },
  });
  if (!card?.isActive || !card.product?.isActive) notFound();

  const profile = await prisma.storeProfile.findUnique({
    where: { merchantId: card.merchantId },
    select: { displayName: true, tagline: true, accentColor: true, city: true },
  });

  const p = card.product;
  const variants = p.variants.map((v) => ({
    id: v.id,
    label: v.color ? `${v.size} - ${v.color}` : v.size,
    available: v.stock - v.reserved > 0,
  }));

  const storeName = profile?.displayName?.trim() || card.merchant.name;
  const idempotencyKey = randomUUID();

  return (
    <div style={safeAccentStyle(profile?.accentColor)} className="min-h-screen bg-surface px-4 py-6 sm:py-10 text-ink">
      <main className="mx-auto w-full max-w-md overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]">
        <header className="border-b border-line bg-soft/60 px-6 py-5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">{storeName}</span>
            <span className="rounded-full border border-line bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted">
              #{p.code}
            </span>
          </div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">{p.name}</h1>
          {profile?.tagline && <p className="text-xs text-muted">{profile.tagline}</p>}
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-xl font-bold text-ink">{fmt.format(p.priceDzd)} DA</p>
            {profile?.city && <span className="text-xs text-muted">{profile.city}</span>}
          </div>
        </header>

        <div className="p-6">
          <OrderForm
            token={token}
            idempotencyKey={idempotencyKey}
            variants={variants}
            deliveryRates={card.merchant.deliveryRates}
          />
        </div>

        <footer className="border-t border-line bg-soft/40 px-6 py-3 text-center text-[11px] text-muted">
          Powered by <span className="font-semibold text-ink">PinCasting</span>
        </footer>
      </main>
    </div>
  );
}
