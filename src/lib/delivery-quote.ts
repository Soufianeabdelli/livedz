import { prisma } from "@/lib/db";

export type DeliveryQuote = { homeDzd: number; stopdeskDzd: number };

// null = the seller has not set a price for this courier wilaya (never treat it as free)
// A saved 0 means the seller chose free delivery on purpose
export async function getDeliveryQuote(merchantId: string, courierCode: number): Promise<DeliveryQuote | null> {
  if (!Number.isInteger(courierCode) || courierCode < 1 || courierCode > 58) return null;
  const rate = await prisma.deliveryRate.findUnique({
    where: { merchantId_wilayaCode: { merchantId, wilayaCode: courierCode } },
    select: { homeDzd: true, stopdeskDzd: true },
  });
  return rate ?? null;
}