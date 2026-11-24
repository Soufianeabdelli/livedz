"use client";

import { useEffect, useState, useTransition } from "react";
import type { CaptureStatus } from "@/lib/live/types";

type LiveQuestionItem = {
  id: string;
  tiktokUsername: string;
  productCode: string | null;
  comment: string;
  createdAt: string;
};

type StatusPayload = CaptureStatus & { questions?: LiveQuestionItem[] };

export function LiveCapture() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const poll = async () => {
    try {
      const res = await fetch("/api/live/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignore network blips */
    }
  };

  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        const res = await fetch("/api/live/status");
        if (res.ok && active) {
          const data = (await res.json()) as StatusPayload;
          setStatus(data);
        }
      } catch {
        /* ignore network blips */
      }
    };
    void sync();
    const timer = setInterval(() => void sync(), 5_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleStart = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/live/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiktokUsername: username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "already_active" ? "Capture deja en cours" : data.detail ?? data.error);
      } else {
        setUsername("");
        await poll();
      }
    });
  };

  const handleStop = () => {
    setError(null);
    startTransition(async () => {
      await fetch("/api/live/stop", { method: "POST" });
      await poll();
    });
  };

  const copyClaimUrl = () => {
    if (!status?.claimPath || typeof window === "undefined") return;
    const url = `${window.location.origin}${status.claimPath}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const questions = status?.questions ?? [];

  return (
    <div className="rounded-lg border border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">TikTok Live</h2>
        {status?.status && status.status !== "IDLE" && (
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
            {status.status}
          </span>
        )}
      </div>

      {status?.active ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm">
              {status.status === "PENDING" ? "En attente du worker" : "En direct"} :{" "}
              <b>@{status.tiktokUsername}</b>
            </span>
          </div>

          {status.claimPath && (
            <div className="rounded border border-gray-700 bg-gray-900/40 p-2 text-xs space-y-1">
              <p className="text-gray-400">Lien client (a afficher en Live) :</p>
              <div className="flex items-center justify-between gap-2">
                <code className="truncate text-green-400">{status.claimPath}</code>
                <button
                  type="button"
                  onClick={copyClaimUrl}
                  className="shrink-0 rounded border border-gray-600 px-2 py-1 text-xs hover:bg-gray-800"
                >
                  {copied ? "Copie !" : "Copier"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 text-center text-xs text-gray-500">
            <div>
              <p className="text-base font-bold text-gray-100">{status.commentsSeen}</p>
              Comms
            </div>
            <div>
              <p className="text-base font-bold text-green-500">{status.ordersCreated}</p>
              Cmds
            </div>
            <div>
              <p className="text-base font-bold text-amber-400">{status.questionsSeen}</p>
              Questions
            </div>
            <div>
              <p className="text-base font-bold text-red-500">{status.errors}</p>
              Erreurs
            </div>
          </div>

          <button
            onClick={handleStop}
            disabled={isPending || status.status === "STOPPING"}
            className="w-full rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {status.status === "STOPPING" ? "Arret en cours..." : isPending ? "Arret..." : "Arreter la capture"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nom d'utilisateur TikTok"
              className="flex-1 rounded border border-gray-600 bg-transparent px-3 py-2 text-sm"
            />
            <button
              onClick={handleStart}
              disabled={isPending || !username.trim()}
              className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? "..." : "Demarrer"}
            </button>
          </div>
          {status?.lastError && <p className="text-xs text-amber-500">Derniere erreur : {status.lastError}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-gray-500">
            Capture best-effort via worker dedie. Les acheteurs completent via /l/token.
          </p>
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-1 border-t border-gray-800 pt-2 text-xs">
          <p className="font-medium text-gray-400">Questions recentes</p>
          <ul className="max-h-28 space-y-1 overflow-y-auto">
            {questions.map((q) => (
              <li key={q.id} className="text-gray-300">
                <b>@{q.tiktokUsername}</b>
                {q.productCode ? ` (${q.productCode})` : ""} : {q.comment}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
