"use client";

import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.assign("/login");
  }

  return (
    <button onClick={logout} disabled={busy} className="rounded border px-4 py-2 disabled:opacity-50">
      {busy ? "..." : "Se deconnecter"}
    </button>
  );
}