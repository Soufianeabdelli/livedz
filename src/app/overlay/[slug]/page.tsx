import { connection } from "next/server";
import { Suspense, type CSSProperties } from "react";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { readableTextOn, safeAccentHex } from "@/lib/color";
import { prisma } from "@/lib/db";
import { dedupeByOffer } from "@/lib/offer-dedupe";
import { resolveOverlayPlatform } from "@/lib/overlay-platform";
import { OverlayCard, type OverlayOffer } from "./overlay-card";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string; platform?: string; theme?: string; bg?: string }>;
};

function getAppOrigin(): string {
  let origin = process.env.APP_URL?.trim() || "https://pincasting.app";
  while (origin.endsWith("/")) origin = origin.slice(0, -1);
  return origin;
}

export default function OverlayPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={null}>
      <OverlayView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OverlayView({ params, searchParams }: Props) {
  await connection();
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
    .slice(0, 12);

  const origin = getAppOrigin();
  const displayHost = origin.replace("https://", "").replace("http://", "");

  const offers: OverlayOffer[] = await Promise.all(
    Array.from(cards, async (c) => {
      const { code: pCode, name: pTitle, priceDzd } = c.product;
      const qrSvg = await QRCode.toString(`${origin}/q/${c.token}`, {
        type: "svg",
        margin: 1,
        width: 180,
      });
      return {
        id: c.id,
        token: c.token,
        code: pCode,
        title: pTitle,
        priceDzd,
        qrSvg,
        shortLabel: `${displayHost}/go/${merchant.slug}`,
      };
    }),
  );

  const accent = safeAccentHex(profile?.accentColor);
  const style = { "--accent": accent, "--accent-ink": readableTextOn(accent) } as CSSProperties;
  const { name: fallbackMerchant } = merchant;

  return (
    <div style={style}>
      <OverlayCard
        slug={merchant.slug}
        merchantName={profile?.displayName?.trim() || fallbackMerchant}
        offers={offers}
        initialState={{
          activeCardId: merchant.activeCardId,
          overlayHidden: merchant.overlayHidden,
          platform: resolveOverlayPlatform(merchant.overlayPlatform),
        }}
        platformOverride={queryPlatform ? resolveOverlayPlatform(queryPlatform) : undefined}
        codeOverride={code}
        theme={theme === "light" ? "light" : "dark"}
        previewBg={bg === "preview"}
      />
    </div>
  );
}