import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { lookupClaimSession } from "@/lib/live/claim";
import { CARD_TOKEN_RE } from "@/lib/token";
import { ClaimForm } from "./claim-form";

type Props = { params: Promise<{ token: string }> };

export default function LiveClaimPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-6 text-center">Chargement...</p>}>
      <ClaimView params={params} />
    </Suspense>
  );
}

async function ClaimView({ params }: Props) {
  await connection();
  const { token } = await params;
  if (!CARD_TOKEN_RE.test(token)) notFound();

  const session = await lookupClaimSession(token);
  if (!session) notFound();

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-6">
      <p className="text-sm text-gray-500">{session.merchant.name}</p>
      <h1 className="text-2xl font-bold">Finaliser ma commande Live</h1>
      <p className="text-sm text-gray-500">
        Live TikTok : <b>@{session.tiktokUsername}</b>
      </p>
      <ClaimForm
        sessionToken={token}
        deliveryRates={session.merchant.deliveryRates}
      />
    </main>
  );
}
