"use client";

import { useState, useTransition } from "react";
import { canTransition, type Status } from "@/lib/order-status";
import { setOrderStatus } from "./actions";

const ERR: Record<string, string> = {
  not_found: "Commande introuvable.",
  invalid_transition: "Action impossible pour ce statut.",
  unauthorized: "Session expiree. Reconnectez-vous.",
};

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const canConfirm = canTransition(status as Status, "CONFIRMED");
  const canCancel = canTransition(status as Status, "CANCELLED");
  if (!canConfirm && !canCancel) return null;

  function run(to: "CONFIRMED" | "CANCELLED") {
    if (to === "CANCELLED" && !window.confirm("Annuler cette commande ? Le stock reserve sera libere.")) return;
    setError("");
    start(async () => {
      const r = await setOrderStatus(orderId, to);
      if (!r.ok) setError(ERR[r.error ?? ""] ?? "Erreur technique.");
    });
  }

  return (
    <div className="space-y-1 pt-2">
      <div className="flex gap-2">
        {canConfirm && (
          <button onClick={() => run("CONFIRMED")} disabled={pending} className="rounded bg-green-700 px-3 py-2 text-white disabled:opacity-50">
            Confirmer
          </button>
        )}
        {canCancel && (
          <button onClick={() => run("CANCELLED")} disabled={pending} className="rounded border border-red-500 px-3 py-2 text-red-400 disabled:opacity-50">
            Annuler
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </div>
  );
}