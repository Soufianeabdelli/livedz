import { DZ_REGIONS } from "@/lib/countries/dz/regions";
import type { listOrders } from "@/lib/merchant-orders";
import { OrderActions } from "./order-actions";

type Order = Awaited<ReturnType<typeof listOrders>>[number];

const LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_CONFIRMATION: "A confirmer",
  NEEDS_INFO: "Infos manquantes",
  AWAITING_CUSTOMER: "Attente client",
  CONFIRMED: "Confirmee",
  SHIPMENT_PENDING: "Envoi en cours",
  SHIPMENT_UNKNOWN: "Envoi incertain",
  SHIPPED: "Expediee",
  OUT_FOR_DELIVERY: "En livraison",
  DELIVERED: "Livree",
  CASH_COLLECTED: "Encaissee",
  RETURNED: "Retournee",
  CANCELLED: "Annulee",
  EXPIRED: "Expiree",
  FAILED: "Echouee",
};

const SOURCE_LABEL: Record<string, string> = {
  LIVE_COMMENT: "Live TikTok",
  QR_LINK: "QR",
  MANUAL: "Manuel",
};

const money = new Intl.NumberFormat("fr-FR");
const when = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Algiers" });
const wilayaName = (key: string | null, code: number | null) =>
  DZ_REGIONS.find((r) => r.key === (key ?? String(code)))?.name ?? "-";

export function OrdersList({ orders, couriers = ["sandbox"] }: { orders: Order[]; couriers?: string[] }) {
  if (orders.length === 0) return <p className="text-gray-500">Aucune commande pour le moment.</p>;
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id} className="space-y-1 rounded border border-gray-600 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <b>#{o.id.slice(-6).toUpperCase()}</b>
              <span className="rounded border border-gray-600 px-1.5 py-0.5 text-[11px] text-gray-300">
                {SOURCE_LABEL[o.source] ?? o.source}
              </span>
            </div>
            <span className="rounded bg-gray-700 px-2 py-1 text-xs">{LABEL[o.status] ?? o.status}</span>
          </div>

          <p className="text-xs text-gray-500">
            {when.format(o.createdAt)}
            {o.callAttempts > 0 && ` • ${o.callAttempts} appel(s)`}
          </p>

          <p>
            {o.customerName}
            {o.tiktokUsername && o.customerName !== `@${o.tiktokUsername}` && (
              <span className="text-xs text-gray-400"> (@{o.tiktokUsername})</span>
            )}
            {o.phone && <> - <a href={`tel:${o.phone}`} className="underline">{o.phone}</a></>}
          </p>

          {o.reputation && o.reputation.risk !== "none" && (
            <p className="text-xs text-amber-400">
              Risque COD ({o.reputation.returnedCount} retour(s), {o.reputation.refusedCount} refus
              {o.reputation.blocked ? ", BLOQUE" : ""})
            </p>
          )}

          {o.wilayaCode && (
            <p>
              {wilayaName(o.officialRegionKey, o.wilayaCode)} - {o.commune} (
              {o.deliveryType === "HOME" ? "Domicile" : "Bureau"})
            </p>
          )}
          {o.address && <p className="text-sm text-gray-400">{o.address}</p>}

          <p className="text-sm">
            {o.items
              .map(
                (i) =>
                  `${i.quantity} x ${i.productName} (${i.variant.size}${i.variant.color ? " " + i.variant.color : ""})`,
              )
              .join(", ")}
          </p>

          <p>
            <b>{money.format(o.totalDzd + o.shippingFeeDzd)} DA</b>
            {o.shippingFeeDzd > 0 && (
              <span className="text-xs text-gray-400"> (dont {money.format(o.shippingFeeDzd)} DA livr.)</span>
            )}
            {o.affiliate && <span className="text-sm text-gray-500"> - @{o.affiliate.handle}</span>}
          </p>

          {o.trackingNumber && (
            <p className="text-xs text-green-400">
              Suivi {o.courier} : <b>{o.trackingNumber}</b>
            </p>
          )}

          <OrderActions orderId={o.id} status={o.status} couriers={couriers} />
        </li>
      ))}
    </ul>
  );
}
