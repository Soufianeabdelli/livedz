import { prisma } from "@/lib/db";
import { isStockCheckViolation } from "@/lib/db-errors";
import { getDeliveryFee } from "@/lib/delivery-rates";
import type { OrderInput } from "@/lib/order-input";

export type CreateOrderResult =
  | { ok: true; orderId: string; totalDzd: number; shippingFeeDzd: number; duplicate: boolean }
  | { ok: false; error: "card_not_found" | "variant_not_found" | "out_of_stock" };

class OutOfStock extends Error {}

export async function createOrder(input: OrderInput): Promise<CreateOrderResult> {
  const card = await prisma.card.findUnique({
    where: { token: input.token },
    include: { product: true },
  });
  if (!card || !card.isActive || !card.product || !card.product.isActive) {
    return { ok: false, error: "card_not_found" };
  }
  const product = card.product;

  // The variant must belong to the product of THIS card
  const variant = await prisma.variant.findFirst({
    where: { id: input.variantId, productId: product.id },
    select: { id: true },
  });
  if (!variant) return { ok: false, error: "variant_not_found" };

  const findExisting = () =>
    prisma.order.findUnique({
      where: {
        merchantId_idempotencyKey: {
          merchantId: card.merchantId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: { id: true, totalDzd: true, shippingFeeDzd: true },
    });

  const dup = (o: { id: string; totalDzd: number; shippingFeeDzd: number }): CreateOrderResult => ({
    ok: true,
    orderId: o.id,
    totalDzd: o.totalDzd,
    shippingFeeDzd: o.shippingFeeDzd,
    duplicate: true,
  });

  const existing = await findExisting();
  if (existing) return dup(existing);

  const shippingFeeDzd = await getDeliveryFee(card.merchantId, input.wilayaCode, input.deliveryType);

  try {
    const order = await prisma.$transaction(async (tx) => {
      // One atomic statement: reserve only if enough stock remains
      const changed = await tx.$executeRaw`
        UPDATE "Variant"
        SET "reserved" = "reserved" + ${input.quantity}::int
        WHERE "id" = ${variant.id} AND "stock" - "reserved" >= ${input.quantity}::int`;
      if (changed !== 1) throw new OutOfStock();

      return tx.order.create({
        data: {
          merchantId: card.merchantId,
          status: "PENDING_CONFIRMATION", // waiting for the merchant to confirm
          source: "QR_LINK",
          idempotencyKey: input.idempotencyKey,
          cardId: card.id,
          affiliateId: card.affiliateId,
          customerName: input.customerName,
          phone: input.phone,
          wilayaCode: input.wilayaCode,
          officialRegionKey: input.officialRegionKey ?? String(input.wilayaCode),
          commune: input.commune,
          deliveryType: input.deliveryType,
          address: input.address || null,
          shippingFeeDzd,
          totalDzd: product.priceDzd * input.quantity, // price from DB, never from the client
          messagingConsent: input.messagingConsent,
          consentAt: input.messagingConsent ? new Date() : null,
          items: {
            create: {
              variantId: variant.id,
              productName: product.name,
              quantity: input.quantity,
              unitPriceDzd: product.priceDzd,
            },
          },
        },
        select: { id: true, totalDzd: true, shippingFeeDzd: true },
      });
    });
    return {
      ok: true,
      orderId: order.id,
      totalDzd: order.totalDzd,
      shippingFeeDzd: order.shippingFeeDzd,
      duplicate: false,
    };
  } catch (e) {
    // A parallel request with the same key may have won the race
    const again = await findExisting();
    if (again) return dup(again);
    if (e instanceof OutOfStock || isStockCheckViolation(e)) return { ok: false, error: "out_of_stock" };
    throw e;
  }
}
