import { prisma } from "@/lib/db";
import { resolveOverlayPlatform, type OverlayPlatform } from "@/lib/overlay-platform";

export type OverlayStateSnapshot = {
  activeCardId: string | null;
  overlayHidden: boolean;
  platform: OverlayPlatform;
};

export async function getOverlayStateBySlug(slug: string): Promise<OverlayStateSnapshot | null> {
  const m = await prisma.merchant.findUnique({
    where: { slug },
    select: { activeCardId: true, overlayHidden: true, overlayPlatform: true },
  });
  if (!m) return null;
  return {
    activeCardId: m.activeCardId,
    overlayHidden: m.overlayHidden,
    platform: resolveOverlayPlatform(m.overlayPlatform),
  };
}

export async function updateActiveCardForMerchant(merchantId: string, cardId: string): Promise<boolean> {
  const card = await prisma.card.findFirst({
    where: { id: cardId, merchantId, isActive: true },
    select: { id: true },
  });
  if (!card) return false;
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { activeCardId: card.id, overlayHidden: false },
  });
  return true;
}

export async function updateOverlayHiddenForMerchant(merchantId: string, hidden: boolean): Promise<boolean> {
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { overlayHidden: hidden },
  });
  return hidden;
}

export async function updateOverlayPlatformForMerchant(
  merchantId: string,
  rawPlatform: string,
): Promise<OverlayPlatform> {
  const platform = resolveOverlayPlatform(rawPlatform);
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { overlayPlatform: platform },
  });
  return platform;
}

export async function getRecentRemoteCounts(merchantId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [ordersCount, interestedCount] = await Promise.all([
    prisma.order.count({ where: { merchantId, createdAt: { gte: since } } }),
    prisma.liveQuestion.count({ where: { merchantId, createdAt: { gte: since } } }),
  ]);
  return { ordersCount, interestedCount };
}
