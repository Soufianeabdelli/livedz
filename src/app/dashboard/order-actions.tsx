"use client";

import { useState, useTransition } from "react";
import { canTransition, type Status } from "@/lib/order-status";
import {
  logCallAction,
  reconcileShipmentAction,
  setOrderStatus,
  shipOrderAction,
} from "./actions";

const ERR: Record<string, string> = {
  not_found: "Commande introuvable.",
  invalid_transition: "Action impossible pour ce statut.",
  unauthorized: "Session expiree. Reconnectez-vous.",
  missing_data: "Coordonnees client incompletes.",
  no_courier_account: "Societe de livraison non configuree.",
  courier_rejected: "Colis refuse par le transporteur.",
  credentials_rejected: "Identifiants transporteur invalides.",
  rate_limited: "Transporteur sature. Reessayez.",
  shipment_unknown: "Delai depasse : verifiez avant de renvoyer.",
  still_unknown: "Statut encore incertain cote transporteur.",
};

export function OrderActions({
  orderId,
  status,
  couriers,
}: {
  orderId: string;
  status: string;
  couriers: string[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [courier, setCourier] = useState(couriers[0] ?? "sandbox");

  const st = status as Status;
  const canConfirm = canTransition(st, "CONFIRMED");
  const canCancel = canTransition(st, "CANCELLED");
  const canCallLog =
    st === "DRAFT" || st === "PENDING_CONFIRMATION" || st === "NEEDS_INFO" || st === "AWAITING_CUSTOMER";
  const canShip = st === "CONFIRMED";
  const canReconcile = st === "SHIPMENT_UNKNOWN";

  if (!canConfirm && !canCancel && !canCallLog && !canShip && !canReconcile) return null;

  function runStatus(to: "CONFIRMED" | "CANCELLED") {
    if (to === "CANCELLED" && !window.confirm("Annuler cette commande ? Le stock reserve sera libere.")) return;
    setError("");
    setInfo("");
    start(async () => {
      const r = await setOrderStatus(orderId, to);
      if (!r.ok) setError(ERR[r.error ?? ""] ?? "Erreur technique.");
    });
  }

  function runCall(outcome: "NO_ANSWER" | "UNREACHABLE" | "CALLBACK") {
    setError("");
    setInfo("");
    start(async () => {
      const r = await logCallAction(orderId, outcome);
      if (!r.ok) setError(ERR[r.error ?? ""] ?? "Erreur technique.");
      else setInfo("Appel enregistre.");
    });
  }

  function runShip() {
    setError("");
    setInfo("");
    start(async () => {
      const r = await shipOrderAction(orderId, courier);
      if (!r.ok) setError(ERR[r.error ?? ""] ?? "Erreur expedition.");
      else if (r.detail) setInfo(`Colis cree : ${r.detail}`);
    });
  }

  function runReconcile() {
    setError("");
    setInfo("");
    start(async () => {
      const r = await reconcileShipmentAction(orderId);
      if (!r.ok) setError(ERR[r.error ?? ""] ?? "Erreur reconciliation.");
      else setInfo(r.detail === "retry_ready" ? "Non cree : pret pour re-envoi." : `Retrouve : ${r.detail}`);
    });
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="flex flex-wrap gap-2">
        {canConfirm && (
          <button
            onClick={() => runStatus("CONFIRMED")}
            disabled={pending}
            className="rounded bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Confirmer
          </button>
        )}
        {canCallLog && (
          <button
            onClick={() => runCall("NO_ANSWER")}
            disabled={pending}
            className="rounded border border-amber-500 px-2.5 py-1.5 text-xs text-amber-300 disabled:opacity-50"
          >
            Pas de reponse
          </button>
        )}
        {canShip && (
          <div className="flex items-center gap-1">
            {couriers.length > 1 && (
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="rounded border border-gray-600 bg-transparent px-2 py-1.5 text-xs"
              >
                {couriers.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <button
              onClick={runShip}
              disabled={pending}
              className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Expedier ({courier})
            </button>
          </div>
        )}
        {canReconcile && (
          <button
            onClick={runReconcile}
            disabled={pending}
            className="rounded bg-amber-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Verifier colis
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => runStatus("CANCELLED")}
            disabled={pending}
            className="rounded border border-red-500 px-3 py-1.5 text-sm text-red-400 disabled:opacity-50"
          >
            Annuler
          </button>
        )}
      </div>
      {info && <p className="text-xs text-green-400">{info}</p>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
