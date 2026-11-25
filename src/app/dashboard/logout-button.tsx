"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} disabled={busy} className="rounded border px-4 py-2 disabled:opacity-50">
      {busy ? "..." : "Se deconnecter"}
    </button>
  );
}
