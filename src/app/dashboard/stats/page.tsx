import { Suspense } from "react";
import { getDashboardStats, getOrdersByStatus } from "./actions";

const STATUS_ORDER = [
  "DRAFT",
  "PENDING_CONFIRMATION",
  "NEEDS_INFO",
  "AWAITING_CUSTOMER",
  "CONFIRMED",
  "SHIPMENT_PENDING",
  "SHIPMENT_UNKNOWN",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CASH_COLLECTED",
  "RETURNED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
];

async function StatsContent() {
  const [stats, byStatus] = await Promise.all([
    getDashboardStats(),
    getOrdersByStatus(),
  ]);

  return (
    <>
      <p>Total orders: {stats.totalOrders}</p>
      <p>Pending confirmation: {stats.pendingConfirmation}</p>

      <table className="mt-6 text-sm">
        <thead>
          <tr>
            <th className="pr-6 text-left">Status</th>
            <th className="text-left">Orders</th>
          </tr>
        </thead>
        <tbody>
          {STATUS_ORDER.map((status) => (
            <tr key={status}>
              <td className="pr-6">{status}</td>
              <td>{byStatus[status] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function StatsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Orders overview</h1>
      <Suspense fallback={<p>Loading stats...</p>}>
        <StatsContent />
      </Suspense>
    </main>
  );
}