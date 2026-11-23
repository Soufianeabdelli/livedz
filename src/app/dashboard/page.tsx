import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getMerchantContext } from "@/lib/merchant";
import { getSessionUser } from "@/lib/session";
import { LogoutButton } from "./logout-button";

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
  const drafts = await prisma.order.count({
    where: { merchantId: ctx.merchantId, status: "DRAFT" },
  });

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">{ctx.merchantName}</h1>
      <p className="text-sm text-gray-500">{user.email} ({ctx.role})</p>
      <p>Nouvelles commandes : <b>{drafts}</b></p>
      <LogoutButton />
    </main>
  );
}