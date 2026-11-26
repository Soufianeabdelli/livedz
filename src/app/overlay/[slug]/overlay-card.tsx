"use client";

import { useState } from "react";

export type OverlayOffer = {
  token: string;
  code: string;
  name: string;
  priceDzd: number;
  qrSvg: string;
  shortLabel: string;
};

const fmt = new Intl.NumberFormat("fr-DZ");

export function OverlayCard({
  merchantName,
  offers,
  initialIndex = 0,
  theme = "dark",
  transparent = false,
}: {
  merchantName: string;
  offers: OverlayOffer[];
  initialIndex?: number;
  theme?: "dark" | "light";
  transparent?: boolean;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const [minimized, setMinimized] = useState(false);

  const active = offers[idx] ?? offers[0];
  if (!active) return null;

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen p-5 flex items-start justify-end ${transparent ? "bg-transparent" : "bg-surface"}`}>
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setMinimized((m) => !m)}
          className="rounded-full border border-white/20 bg-black/65 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md transition hover:bg-black/80"
        >
          {minimized ? `Show QR (#${active.code})` : "Tap to Minimize"}
        </button>

        {!minimized && (
          <div
            className={`w-[210px] rounded-3xl p-4 text-center shadow-2xl backdrop-blur-md border ${
              isDark
                ? "bg-black/75 border-white/20 text-white"
                : "bg-card/95 border-line text-ink"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest opacity-75">
              {merchantName}
            </div>
            <div className="mt-2 inline-block rounded-2xl bg-white p-2 shadow-sm">
              <div
                className="h-[148px] w-[148px] [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: active.qrSvg }}
              />
            </div>
            <div className="mt-2.5 text-xs font-bold tracking-wide uppercase">
              OFFER #{active.code}
            </div>
            <div className="truncate text-xs opacity-85">{active.name}</div>
            <div className="mt-1 text-base font-bold">{fmt.format(active.priceDzd)} DZD</div>
            <div className="mt-2 inline-block rounded-full bg-card px-3 py-1 text-[11px] font-bold text-ink">
              {active.shortLabel}
            </div>
            <div className="mt-1.5 text-[10px] opacity-75">
              Scan QR or enter <b>#{active.code}</b>
            </div>

            {offers.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 pt-2 border-t border-current/15">
                {offers.map((o, i) => (
                  <button
                    key={o.token}
                    type="button"
                    onClick={() => setIdx(i)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                      i === idx
                        ? "bg-accent text-accent-ink"
                        : "bg-current/10 opacity-75 hover:opacity-100"
                    }`}
                  >
                    #{o.code}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
