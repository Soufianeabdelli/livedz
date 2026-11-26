import { Suspense, type CSSProperties } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { readableTextOn } from "@/lib/color";
import { prisma } from "@/lib/db";
import { OverlayCard, type OverlayOffer } from "./overlay-card";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string; theme?: string; bg?: string }>;
};

export default function OverlayPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={null}>
      <OverlayView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OverlayView({ params, searchParams }: Props) {
  const { slug } = await params;
  const { code, theme, bg } = await searchParams;

  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!merchant) notFound();

  const [profile, cards] = await Promise.all([
    prisma.storeProfile.findUnique({
      where: { merchantId: merchant.id },
      select: { displayName: true, accentColor: true },
    }),
    prisma.card.findMany({
      where: { merchantId: merchant.id, isActive: true, product: { isActive: true } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        token: true,
        product: { select: { code: true, name: true, priceDzd: true } },
      },
    }),
  ]);

  if (cards.length === 0) notFound();

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "pincasting.app";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  const offers: OverlayOffer[] = await Promise.all(
    cards.map(async (c) => {
      const url = `${proto}://${host}/q/${c.token}`;
      const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, width: 180 });
      return {
        token: c.token,
        code: c.product.code,
        name: c.product.name,
        priceDzd: c.product.priceDzd,
        qrSvg,
        shortLabel: `${host}/go?code=${c.product.code}`,
      };
    }),
  );

  const initialIndex = code
    ? Math.max(0, offers.findIndex((o) => o.code.toLowerCase() === code.replace(/^#/, "").toLowerCase()))
    : 0;

  const accent = profile?.accentColor && /^#[0-9a-f]{6}$/i.test(profile.accentColor) ? profile.accentColor : "#4F5842";
  const style = { "--accent": accent, "--accent-ink": readableTextOn(accent) } as CSSProperties;

  return (
    <div style={style}>
      <OverlayCard
        merchantName={profile?.displayName?.trim() || merchant.name}
        offers={offers}
        initialIndex={initialIndex}
        theme={theme === "light" ? "light" : "dark"}
        transparent={bg === "transparent"}
      />
    </div>
  );
}
