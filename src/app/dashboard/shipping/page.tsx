import { Suspense } from "react";
import { redirect } from "next/navigation";
import { listCourierAccounts } from "@/lib/courier-accounts";
import { DZ_REGIONS } from "@/lib/countries/dz/regions";
import { getCourier } from "@/lib/couriers/registry";
import { getMerchantContext } from "@/lib/merchant";
import { getSessionUser } from "@/lib/session";
import { removeAccount } from "./actions";
import { ShippingForm } from "./shipping-form";

export default function ShippingPage() {
  return (
    <Suspense fallback={<p className="p-6">Chargement...</p>}>
      <Shipping />
    </Suspense>
  );
}

async function Shipping() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getMerchantContext(user);

  if (ctx.role !== "OWNER") {
    return (
      <main className="mx-auto w-full max-w-md space-y-4 p-6">
        <p>Seul le proprietaire peut gerer la livraison.</p>
        <a href="/dashboard" className="underline">Retour</a>
      </main>
    );
  }

  const accounts = await listCourierAccounts(ctx.merchantId);
  const wilaya = (code: number) => DZ_REGIONS.find((r) => r.key === String(code))?.name;

  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Livraison</h1>
        <a href="/dashboard" className="text-sm underline">Retour</a>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Societes configurees</h2>
        {accounts.length === 0 && <p className="text-gray-500">Aucune pour le moment.</p>}
        {accounts.map((a) => (
          <div key={a.courier} className="flex items-center justify-between rounded border border-gray-600 p-3">
            <div>
              <p className="font-medium">{getCourier(a.courier)?.label ?? a.courier}</p>
              <p className="text-sm text-gray-500">
                {a.hint}{a.fromWilaya ? ` - depart ${wilaya(a.fromWilaya) ?? a.fromWilaya}` : ""}
              </p>
            </div>
            <form action={removeAccount.bind(null, a.courier)}>
              <button type="submit" className="rounded border border-red-500 px-3 py-2 text-red-400">Supprimer</button>
            </form>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Ajouter ou remplacer</h2>
        <ShippingForm />
        <p className="text-xs text-gray-500">Les cles sont chiffrees et ne sont plus jamais affichees.</p>
      </section>
    </main>
  );
}