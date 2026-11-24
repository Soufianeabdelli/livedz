import { Suspense } from "react";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CARD_TOKEN_RE } from "@/lib/token";
import { OrderForm } from "./order-form";

type Props = { params: Promise<{ token: string }> };

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-6 text-center">Chargement...</p>}>
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

  const p = card.product;
  const variants = p.variants.map((v) => ({
    id: v.id,
    label: v.color ? `${v.size} - ${v.color}` : v.size,
    available: v.stock - v.reserved > 0,
  }));

  const idempotencyKey = randomUUID();

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-6">
      <p className="text-sm text-gray-500">{card.merchant.name}</p>
      <h1 className="text-2xl font-bold">#{p.code} {p.name}</h1>
      <p className="text-xl">{fmt.format(p.priceDzd)} DA</p>
      <OrderForm
        token={token}
        idempotencyKey={idempotencyKey}
        variants={variants}
        deliveryRates={card.merchant.deliveryRates}
      />
    </main>
  );
}
