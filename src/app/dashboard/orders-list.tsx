import { DZ_REGIONS } from "@/lib/countries/dz/regions";
import type { listOrders } from "@/lib/merchant-orders";
import { OrderActions } from "./order-actions";

type Order = Awaited<ReturnType<typeof listOrders>>[number];

const LABEL: Record<string, string> = {
  DRAFT: "Nouvelle",
  NEEDS_INFO: "Infos manquantes",
  AWAITING_CUSTOMER: "Attente client",
  CONFIRMED: "Confirmee",
  CANCELLED: "Annulee",
};
const money = new Intl.NumberFormat("fr-FR");
const when = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Algiers" });
const wilayaName = (code: number | null) => DZ_REGIONS.find((r) => r.key === String(code))?.name ?? "-";

export function OrdersList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return <p className="text-gray-500">Aucune commande pour le moment.</p>;
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id} className="space-y-1 rounded border border-gray-600 p-3">
          <div className="flex items-center justify-between">
            <b>#{o.id.slice(-6).toUpperCase()}</b>
            <span className="rounded bg-gray-700 px-2 py-1 text-xs">{LABEL[o.status] ?? o.status}</span>
          </div>
          <p className="text-xs text-gray-500">{when.format(o.createdAt)}</p>
          <p>
            {o.customerName}
            {o.phone && <> - <a href={`tel:${o.phone}`} className="underline">{o.phone}</a></>}
          </p>
          <p>{wilayaName(o.wilayaCode)} - {o.commune} ({o.deliveryType === "HOME" ? "Domicile" : "Bureau"})</p>
          {o.address && <p className="text-sm text-gray-400">{o.address}</p>}
          <p className="text-sm">
            {o.items.map((i) => `${i.quantity} x ${i.productName} (${i.variant.size}${i.variant.color ? " " + i.variant.color : ""})`).join(", ")}
          </p>
          <p><b>{money.format(o.totalDzd)} DA</b>{o.affiliate && <span className="text-sm text-gray-500"> - @{o.affiliate.handle}</span>}</p>
          <OrderActions orderId={o.id} status={o.status} />
        </li>
      ))}
    </ul>
  );
}