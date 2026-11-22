import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ token: string }> };

// Cache Components: dynamic data must be inside <Suspense>
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
  // 16 random bytes in base64url = 22 chars. Reject anything else before hitting the DB.
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();

  const card = await prisma.card.findUnique({
    where: { token },
    include: {
      merchant: { select: { name: true } },
      product: { include: { variants: { orderBy: { size: "asc" } } } },
    },
  });
  if (!card?.isActive || !card.product?.isActive) notFound();

  const p = card.product;
  return (
    <main className="mx-auto w-full max-w-md p-6 space-y-4">
      <p className="text-sm text-gray-500">{card.merchant.name}</p>
      <h1 className="text-2xl font-bold">
        #{p.code} {p.name}
      </h1>
      <p className="text-xl">{fmt.format(p.priceDzd)} DA</p>

      <div>
        <p className="mb-2 font-medium">Pointures disponibles</p>
        <div className="flex flex-wrap gap-2">
          {p.variants.map((v) => {
            const available = v.stock - v.reserved > 0;
            return (
              <span
                key={v.id}
                className={`rounded border px-3 py-2 ${available ? "" : "line-through opacity-40"}`}
              >
                {v.size} {v.color && `· ${v.color}`}
              </span>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-gray-500">Formulaire de commande : prochaine étape.</p>
    </main>
  );
}