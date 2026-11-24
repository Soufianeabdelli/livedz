"use client";

import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { submitOrder } from "./actions";
import { MSG } from "./messages";
import { Success } from "./success";
import { VariantPicker, type V } from "./variant-picker";
import { DZ_REGIONS, resolveDzRegion } from "@/lib/countries/dz/regions";
import type { OrderFormState } from "@/lib/order-form";

const INIT: OrderFormState = { status: "idle" };
const fmt = new Intl.NumberFormat("fr-DZ");

type DeliveryRateInfo = { wilayaCode: number; homeDzd: number; stopdeskDzd: number };
type Props = {
  token: string;
  idempotencyKey: string;
  variants: V[];
  deliveryRates?: DeliveryRateInfo[];
};

export function OrderForm({ token, idempotencyKey, variants, deliveryRates = [] }: Props) {
  const [state, action, pending] = useActionState(submitOrder, INIT);
  const [delivery, setDelivery] = useState<"STOPDESK" | "HOME">("STOPDESK");
  const [regionKey, setRegionKey] = useState("");

  const fee = useMemo(() => {
    const r = resolveDzRegion(regionKey);
    if (!r) return null;
    const rate = deliveryRates.find((d) => d.wilayaCode === r.courierCode);
    if (!rate) return null;
    return delivery === "HOME" ? rate.homeDzd : rate.stopdeskDzd;
  }, [regionKey, delivery, deliveryRates]);

  if (state.status === "success") {
    return <Success refCode={state.ref} totalDzd={state.totalDzd + (state.shippingFeeDzd ?? 0)} />;
  }

  const bad = (f: string) => state.status === "error" && state.fields.includes(f);
  const box = (f: string) => `w-full rounded border p-2 ${bad(f) ? "border-red-500" : "border-gray-400"}`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="quantity" value="1" />

      <VariantPicker variants={variants} invalid={bad("variantId")} />

      <input name="customerName" placeholder="Nom complet" autoComplete="name" required className={box("customerName")} />
      <input name="phone" type="tel" inputMode="tel" placeholder="Telephone (05 50 12 34 56)" autoComplete="tel" required className={box("phone")} />

      <select
        name="region"
        required
        value={regionKey}
        onChange={(e) => setRegionKey(e.target.value)}
        className={box("region")}
      >
        <option value="" disabled>Wilaya</option>
        {DZ_REGIONS.map((r) => (
          <option key={r.key} value={r.key}>{r.name}</option>
        ))}
      </select>
      <input name="commune" placeholder="Commune" required className={box("commune")} />

      <div className="flex gap-4">
        <label>
          <input type="radio" name="deliveryType" value="STOPDESK" checked={delivery === "STOPDESK"} onChange={() => setDelivery("STOPDESK")} /> Bureau
        </label>
        <label>
          <input type="radio" name="deliveryType" value="HOME" checked={delivery === "HOME"} onChange={() => setDelivery("HOME")} /> Domicile
        </label>
      </div>
      {fee !== null && (
        <p className="text-sm text-gray-600">
          Livraison ({delivery === "HOME" ? "Domicile" : "Bureau"}) : <b>{fmt.format(fee)} DA</b>
        </p>
      )}
      {delivery === "HOME" && (
        <textarea name="address" placeholder="Adresse complete" required rows={2} className={box("address")} />
      )}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-1" />
        Oui, envoyez-moi des messages WhatsApp sur ma commande.
      </label>

      {state.status === "error" && (
        <p role="alert" className="text-red-600">{MSG[state.error] ?? MSG.server_error}</p>
      )}

      <button type="submit" disabled={pending} className="w-full rounded bg-black p-3 text-white disabled:opacity-50">
        {pending ? "Envoi..." : "Commander (paiement a la livraison)"}
      </button>
    </form>
  );
}
