import { Suspense, type CSSProperties } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { readableTextOn } from "@/lib/color";
import { prisma } from "@/lib/db";
import { dedupeByOffer } from "@/lib/offer-dedupe";
import { isQrAllowedOnPlatform, resolveOverlayPlatform } from "@/lib/overlay-platform";
import { OverlayCard, type OverlayOffer } from "./overlay-card";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string; platform?: string; theme?: string; bg?: string }>;
};

const ALLOWED_ACCENTS = new Set(["#4f5842", "#7a4e2d", "#2f2a26", "#2c4a52"]);

export default function OverlayPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={null}>
      <OverlayView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OverlayView({ params, searchParams }: Props) {
  const { slug } = await params;
  const { code, platform: queryPlatform, theme, bg } = await searchParams;

  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      activeCardId: true,
      overlayPlatform: true,
      overlayHidden: true,
    },
  });
  if (!merchant) notFound();
  if (merchant.overlayHidden) return null;

  const platform = resolveOverlayPlatform(queryPlatform ?? merchant.overlayPlatform);
  const allowQr = isQrAllowedOnPlatform(platform);

  const [profile, rawCards] = await Promise.all([
    prisma.storeProfile.findUnique({
      where: { merchantId: merchant.id },
      select: { displayName: true, accentColor: true },
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
        product: { select: { code: true, name: true, priceDzd: true } },
      },
    }),
  ]);

  const cards = dedupeByOffer(rawCards)
    .filter((c): c is typeof c & { product: NonNullable<typeof c.product> } => c.product !== null)
    .slice(0, 6);
  if (cards.length === 0) notFound();

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "pincasting.app";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  const offers: OverlayOffer[] = await Promise.all(
    Array.from(cards, async (c) => {
      const { code: pCode, name: pTitle, priceDzd } = c.product;
      const qrSvg = allowQr
        ? await QRCode.toString(`${proto}://${host}/q/${c.token}`, { type: "svg", margin: 1, width: 180 })
        : null;
      return {
        token: c.token,
        code: pCode,
        title: pTitle,
        priceDzd,
        qrSvg,
        shortLabel: allowQr ? `${host}/go/${merchant.slug}` : null,
      };
    }),
  );

  let initialIndex = 0;
  if (code) {
    const clean = code.replace(/^#/, "").toLowerCase();
    const byCode = offers.findIndex((o) => o.code.toLowerCase() === clean);
    if (byCode >= 0) initialIndex = byCode;
  } else if (merchant.activeCardId) {
    const byActive = cards.findIndex((c) => c.id === merchant.activeCardId);
    if (byActive >= 0) initialIndex = byActive;
  }

  const rawAccent = profile?.accentColor;
  const accent = rawAccent && ALLOWED_ACCENTS.has(rawAccent.toLowerCase()) ? rawAccent : "#4F5842";
  const style = { "--accent": accent, "--accent-ink": readableTextOn(accent) } as CSSProperties;
  const { name: fallbackMerchant } = merchant;

  return (
    <div style={style}>
      <OverlayCard
        merchantName={profile?.displayName?.trim() || fallbackMerchant}
        offers={offers}
        initialIndex={initialIndex}
        platform={platform}
        theme={theme === "light" ? "light" : "dark"}
        transparent={bg === "transparent"}
      />
    </div>
  );
}
