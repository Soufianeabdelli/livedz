"use client";

import { useState, useTransition } from "react";
import { isQrAllowedOnPlatform, type OverlayPlatform } from "@/lib/overlay-platform";
import { setActiveCard, setOverlayHidden, setOverlayPlatform } from "./actions";

export type RemoteItem = {
  cardId: string;
  code: string;
  title: string;
  priceDzd: number;
  available: number;
};

const fmt = new Intl.NumberFormat("fr-DZ");

const PLATFORMS: Array<{ id: OverlayPlatform; label: string }> = [
  { id: "tiktok", label: "TikTok (No QR)" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube / FB" },
];

export function RemoteClient({
  slug,
  items,
  initialActiveCardId,
  initialPlatform,
  initialHidden,
  ordersCount,
  interestedCount,
}: {
  slug: string;
  items: RemoteItem[];
  initialActiveCardId: string | null;
  initialPlatform: OverlayPlatform;
  initialHidden: boolean;
  ordersCount: number;
  interestedCount: number;
}) {
  const [activeCardId, setActiveCardState] = useState(initialActiveCardId ?? items[0]?.cardId ?? null);
  const [platform, setPlatformState] = useState<OverlayPlatform>(initialPlatform);
  const [hidden, setHiddenState] = useState(initialHidden);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current = items.find((i) => i.cardId === activeCardId) ?? items[0] ?? null;

  function flashStatus(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2000);
  }

  function onSelectItem(cardId: string) {
    setActiveCardState(cardId);
    setHiddenState(false);
    startTransition(async () => {
      await setActiveCard(cardId);
      flashStatus("Overlay updated ✓");
    });
  }

  function onSelectPlatform(next: OverlayPlatform) {
    setPlatformState(next);
    startTransition(async () => {
      await setOverlayPlatform(next);
      flashStatus("Platform updated ✓");
    });
  }

  function onToggleHidden() {
    const next = !hidden;
    setHiddenState(next);
    startTransition(async () => {
      await setOverlayHidden(next);
      flashStatus(next ? "Overlay hidden ✓" : "Overlay visible ✓");
    });
  }

  function copyPath(label: string, pathStr: string) {
    const full = typeof window !== "undefined" ? `${window.location.origin}${pathStr}` : pathStr;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(full).catch(() => {});
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5">
      <div className="rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted">
            {hidden ? "Overlay Hidden" : "Now Showing"}
          </span>
          <div className="flex items-center gap-2">
            {statusMsg && <span className="text-[11px] font-semibold text-emerald-700">{statusMsg}</span>}
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${hidden ? "bg-soft text-muted" : "bg-rose-600 text-white"}`}>
              {hidden ? "PAUSED" : "ON AIR"}
            </span>
          </div>
        </div>

        {current ? (
          <div className="mt-3">
            <div className="font-mono text-sm font-bold text-accent">#{current.code}</div>
            <div className="font-serif text-2xl font-semibold text-ink">{current.title}</div>
            <div className="mt-1 flex items-center justify-between text-sm text-muted">
              <span className="font-bold text-ink">{fmt.format(current.priceDzd)} DA</span>
              <span>{current.available} left</span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Add an active product to start switching live.</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-line pt-4 text-center">
          <div className="rounded-2xl bg-surface p-3">
            <div className="text-[11px] font-medium text-muted">Orders (24h)</div>
            <div className="font-serif text-2xl font-bold text-ink">{ordersCount}</div>
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <div className="text-[11px] font-medium text-muted">Interested</div>
            <div className="font-serif text-2xl font-bold text-ink">{interestedCount}</div>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-line bg-card p-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Tap to Switch Live
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from(items, (item) => {
              const selected = !hidden && item.cardId === current?.cardId;
              return (
                <button
                  key={item.cardId}
                  type="button"
                  disabled={pending}
                  onClick={() => onSelectItem(item.cardId)}
                  className={`min-h-[68px] rounded-2xl border p-3.5 text-left transition ${
                    selected
                      ? "border-accent bg-accent text-accent-ink shadow-sm"
                      : "border-line bg-surface text-ink hover:border-accent"
                  }`}
                >
                  <div className="font-mono text-sm font-bold">#{item.code}</div>
                  <div className="truncate text-xs font-medium opacity-90 mt-0.5">{item.title}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-card)] border border-line bg-card p-5 space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Stream Platform
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from(PLATFORMS, (p) => {
              const selected = platform === p.id || (p.id === "youtube" && isQrAllowedOnPlatform(platform));
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={pending}
                  onClick={() => onSelectPlatform(p.id)}
                  className={`min-h-[44px] rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${
                    selected
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-surface text-ink hover:border-accent"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            {isQrAllowedOnPlatform(platform)
              ? "QR + short bio link shown on overlay."
              : "TikTok/Instagram safe mode: QR and URLs are hidden automatically."}
          </p>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={onToggleHidden}
          className={`min-h-[48px] w-full rounded-full border px-4 py-3 text-sm font-semibold transition ${
            hidden
              ? "border-accent bg-accent text-accent-ink"
              : "border-line bg-surface text-ink hover:border-accent"
          }`}
        >
          {hidden ? "Show Overlay on Stream" : "Hide Overlay"}
        </button>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line">
          <button
            type="button"
            onClick={() => copyPath("bio", `/go/${slug}`)}
            className="min-h-[44px] rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-accent"
          >
            {copied === "bio" ? "Copied Bio Link!" : "Copy Bio Link"}
          </button>
          <button
            type="button"
            onClick={() => copyPath("overlay", `/overlay/${slug}`)}
            className="min-h-[44px] rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-accent"
          >
            {copied === "overlay" ? "Copied Overlay!" : "Copy OBS Overlay"}
          </button>
        </div>
      </div>
    </div>
  );
}
