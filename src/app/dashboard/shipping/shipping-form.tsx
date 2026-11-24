"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { DZ_REGIONS } from "@/lib/countries/dz/regions";
import { COURIERS, getCourier, searchCouriers } from "@/lib/couriers/registry";
import { saveAccount } from "./actions";

const ERR: Record<string, string> = {
  unauthorized: "Seul le proprietaire peut modifier ces reglages.",
  unknown_courier: "Societe de livraison inconnue.",
  missing_field: "Remplissez tous les champs.",
  bad_wilaya: "Choisissez la wilaya de depart.",
  server_error: "Erreur technique. Reessayez.",
};

const BASE_WILAYAS = DZ_REGIONS.filter((r) => /^\d+$/.test(r.key)); // the 58 courier wilayas
const box = "w-full rounded border border-gray-400 p-2";

export function ShippingForm() {
  const [courier, setCourier] = useState(COURIERS[0].key);
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const def = getCourier(courier) ?? COURIERS[0];
  const list = useMemo(() => searchCouriers(query), [query]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setMsg(null);
    start(async () => {
      const r = await saveAccount(fd);
      if (r.ok) {
        form.reset();
        setCourier(COURIERS[0].key);
        setQuery("");
        setMsg({ ok: true, text: "Enregistre." });
      } else {
        setMsg({ ok: false, text: ERR[r.error ?? ""] ?? ERR.server_error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher (Yalidine, ZR, Maystro...)" className={box} />
      <div role="radiogroup" className="max-h-56 space-y-1 overflow-y-auto rounded border border-gray-600 p-1">
        {list.length === 0 && <p className="p-2 text-sm text-gray-500">Aucun resultat.</p>}
        {list.map((c) => (
          <label key={c.key}
            className={`flex cursor-pointer items-center justify-between rounded p-2 ${courier === c.key ? "bg-white/10" : ""}`}>
            <span>
              <input type="radio" name="courierPick" value={c.key} checked={courier === c.key}
                onChange={() => setCourier(c.key)} className="mr-2" />
              {c.label}
            </span>
            <span className="text-xs text-gray-500">
              {c.canCancel ? "annulation " : ""}{c.hasLabel ? "etiquette" : ""}
            </span>
          </label>
        ))}
      </div>
      <input type="hidden" name="courier" value={courier} />

      {def.fields.map((f) => (
        <input key={`${courier}-${f.key}`} name={`f_${f.key}`} type={f.secret ? "password" : "text"}
          placeholder={f.label} autoComplete="off" required className={box} />
      ))}

      {def.needsFromWilaya && (
        <select name="fromWilaya" required defaultValue="" className={box}>
          <option value="" disabled>Wilaya de depart</option>
          {BASE_WILAYAS.map((r) => (
            <option key={r.key} value={r.courierCode}>{r.name}</option>
          ))}
        </select>
      )}

      {msg && <p role="alert" className={msg.ok ? "text-green-500" : "text-red-500"}>{msg.text}</p>}
      <button type="submit" disabled={pending} className="w-full rounded bg-black p-3 text-white disabled:opacity-50">
        {pending ? "..." : "Enregistrer"}
      </button>
    </form>
  );
}