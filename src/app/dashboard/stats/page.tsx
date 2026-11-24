import { getDashboardStats } from "./actions";

export default async function StatsPage() {
  const stats = await getDashboardStats();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Orders overview</h1>
      <p>Total orders: {stats.totalOrders}</p>
      <p>Pending confirmation: {stats.pendingConfirmation}</p>
    </main>
  );
}