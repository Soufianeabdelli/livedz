"use client";

import { startTransition, useActionState, useMemo, useState, useTransition, type FormEvent } from "react";
import { DZ_REGIONS, resolveDzRegion } from "@/lib/countries/dz/regions";
import { lookupLiveOrders, submitLiveClaim, type ClaimFormState, type LookupState } from "./actions";

const INIT: ClaimFormState = { ok: false, error: "idle" };
const fmt = new Intl.NumberFormat("fr-DZ");

type DeliveryRateInfo = { wilayaCode: number; homeDzd: number; stopdeskDzd: number };

const ERR_MSG: Record<string, string> = {
  rate_limited: "Trop de tentatives. Reessayez dans quelques minutes.",
  invalid_input: "Verifiez les champs en rouge.",
  no_pending_orders: "Aucune commande en attente (ou delai expire).",
  session_not_found: "Ce lien de live n'est plus actif.",
};

export function ClaimForm({
  sessionToken,
  deliveryRates,
}: {
  sessionToken: string;
  deliveryRates: DeliveryRateInfo[];
}) {
  const [handle, setHandle] = useState("");
  const [lookup, setLookup] = useState<LookupState | null>(null);
  const [lookingUp, startLookup] = useTransition();
  const [state, action, pending] = useActionState(submitLiveClaim, INIT);
  const [delivery, setDelivery] = useState<"STOPDESK" | "HOME">("STOPDESK");
  const [regionKey, setRegionKey] = useState("");

  const fee = useMemo(() => {
    const r = resolveDzRegion(regionKey);
    if (!r) return null;
    const rate = deliveryRates.find((d) => d.wilayaCode === r.courierCode);
    if (!rate) return null;
    return delivery === "HOME" ? rate.homeDzd : rate.stopdeskDzd;
  }, [regionKey, delivery, deliveryRates]);

  const productsTotal = useMemo(
    () => (lookup?.orders ?? []).reduce((s, o) => s + o.totalDzd, 0),
    [lookup],
  );

  if (state.ok) {
    return (
      <div className="space-y-2 rounded border border-green-600 p-4">
        <p className="text-lg font-bold">Commande confirmee !</p>
        <p>
          Reference(s) : <b>{state.orderRefs.join(", ")}</b>
        </p>
        <p>Produits : {fmt.format(state.productsTotalDzd)} DA</p>
        {state.shippingFeeDzd > 0 && <p>Livraison : {fmt.format(state.shippingFeeDzd)} DA</p>}
        <p className="font-semibold">Total : {fmt.format(state.grandTotalDzd)} DA</p>
        <p className="text-sm text-gray-500">Le vendeur va vous appeler pour confirmer.</p>
      </div>
    );
  }

  const bad = (f: string) =>
    !state.ok && state.error === "invalid_input" && (state.fields ?? []).includes(f);
  const box = (f: string) =>
    `w-full rounded border p-2 ${bad(f) ? "border-red-500" : "border-gray-400"}`;

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    startLookup(async () => {
      const res = await lookupLiveOrders(sessionToken, handle);
      setLookup(res);
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Votre pseudo TikTok (@...)"
          required
          className="flex-1 rounded border border-gray-400 p-2"
        />
        <button
          type="submit"
          disabled={lookingUp || !handle.trim()}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {lookingUp ? "..." : "Rechercher"}
        </button>
      </form>

      {lookup?.error && <p className="text-sm text-red-600">{lookup.error}</p>}

      {lookup && lookup.orders.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="sessionToken" value={sessionToken} />
          <input type="hidden" name="tiktokHandle" value={handle} />

          <div className="space-y-1 rounded border border-gray-600 p-3 text-sm">
            <p className="font-semibold">Vos articles reserves ({lookup.orders.length}) :</p>
            {lookup.orders.map((o) => (
              <div key={o.id} className="flex justify-between">
                <span>
                  {o.items.map((i) => `${i.quantity}x ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ""}`).join(", ")}
                </span>
                <b>{fmt.format(o.totalDzd)} DA</b>
              </div>
            ))}
          </div>

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
              Livraison : <b>{fmt.format(fee)} DA</b> — Total estime : <b>{fmt.format(productsTotal + fee)} DA</b>
            </p>
          )}
          {delivery === "HOME" && (
            <textarea name="address" placeholder="Adresse complete" required rows={2} className={box("address")} />
          )}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consent" className="mt-1" />
            Oui, envoyez-moi des messages WhatsApp sur ma commande.
          </label>

          {!state.ok && state.error !== "idle" && (
            <p role="alert" className="text-red-600">{ERR_MSG[state.error] ?? "Erreur technique."}</p>
          )}

          <button type="submit" disabled={pending} className="w-full rounded bg-green-700 p-3 text-white disabled:opacity-50">
            {pending ? "Envoi..." : "Valider mes coordonnees (COD)"}
          </button>
        </form>
      )}
    </div>
  );
}
