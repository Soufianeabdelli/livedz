import { prisma } from "@/lib/db";

export async function getDeliveryFee(
  merchantId: string,
  wilayaCode: number,
  deliveryType: "HOME" | "STOPDESK",
): Promise<number> {
  const rate = await prisma.deliveryRate.findUnique({
    where: { merchantId_wilayaCode: { merchantId, wilayaCode } },
    select: { homeDzd: true, stopdeskDzd: true },
  });
  if (!rate) return 0;
  return deliveryType === "HOME" ? rate.homeDzd : rate.stopdeskDzd;
}

export async function listDeliveryRates(merchantId: string) {
  return prisma.deliveryRate.findMany({
    where: { merchantId },
    orderBy: { wilayaCode: "asc" },
    select: { wilayaCode: true, homeDzd: true, stopdeskDzd: true },
  });
}

export async function upsertDeliveryRate(
  merchantId: string,
  wilayaCode: number,
  homeDzd: number,
  stopdeskDzd: number,
) {
  if (!Number.isInteger(wilayaCode) || wilayaCode < 1 || wilayaCode > 58) {
    return { ok: false as const, error: "bad_wilaya" as const };
  }
  if (!Number.isInteger(homeDzd) || homeDzd < 0 || !Number.isInteger(stopdeskDzd) || stopdeskDzd < 0) {
    return { ok: false as const, error: "bad_fee" as const };
  }
  await prisma.deliveryRate.upsert({
    where: { merchantId_wilayaCode: { merchantId, wilayaCode } },
    update: { homeDzd, stopdeskDzd },
    create: { merchantId, wilayaCode, homeDzd, stopdeskDzd },
  });
  return { ok: true as const };
}
