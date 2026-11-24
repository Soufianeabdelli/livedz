import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getMerchantContext } from "@/lib/merchant";
import { listOrders } from "@/lib/merchant-orders";
import { getSessionUser } from "@/lib/session";
import { LogoutButton } from "./logout-button";
import { OrdersList } from "./orders-list";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-6">Chargement...</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const ctx = await getMerchantContext(user);
  const orders = await listOrders(ctx.merchantId);
  const fresh = orders.filter((o) => o.status === "DRAFT").length;

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">{ctx.merchantName}</h1>
      <p className="text-sm text-gray-500">{user.email} ({ctx.role})</p>
      <div className="flex items-center justify-between">
        <p>Nouvelles commandes : <b>{fresh}</b></p>
        <a href="/dashboard" className="text-sm underline">Actualiser</a>
      </div>
      <OrdersList orders={orders} />
      <a href="/dashboard/shipping" className="block rounded border p-3 text-center">Livraison</a>
      <LogoutButton />
    </main>
  );
}