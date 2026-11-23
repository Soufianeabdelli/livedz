import { Suspense } from "react";
import { redirect } from "next/navigation";
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

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p>Connecte : {user.email ?? user.phone ?? user.uid}</p>
      <LogoutButton />
    </main>
  );
}