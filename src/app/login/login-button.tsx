"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, inMemoryPersistence, setPersistence, signInWithPopup, signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

export function LoginButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function login() {
    setBusy(true);
    setError("");
    try {
      const auth = clientAuth();
      await setPersistence(auth, inMemoryPersistence); // never store tokens in the browser
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      await signOut(auth); // session now lives only in the httpOnly cookie
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "login_failed");
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "login_failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={login} disabled={busy} className="w-full rounded bg-black p-3 text-white disabled:opacity-50">
        {busy ? "Connexion..." : "Continuer avec Google"}
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
