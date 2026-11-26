"use client";

import { useEffect, useState } from "react";
import { isQrAllowedOnPlatform, type OverlayPlatform } from "@/lib/overlay-platform";
import type { OverlayStateSnapshot } from "@/lib/overlay-state";

export type OverlayOffer = {
  id: string;
  token: string;
  code: string;
  title: string;
  priceDzd: number;
  qrSvg: string;
  shortLabel: string;
};

const fmt = new Intl.NumberFormat("fr-DZ");
const POLL_MS = 2000;

export function OverlayCard({
  slug,
  merchantName,
  offers,
  initialState,
  platformOverride,
  codeOverride,
  theme = "dark",
  previewBg = false,
}: {
  slug: string;
  merchantName: string;
  offers: OverlayOffer[];
  initialState: OverlayStateSnapshot;
  platformOverride?: OverlayPlatform;
  codeOverride?: string;
  theme?: "dark" | "light";
  previewBg?: boolean;
}) {
  const [live, setLive] = useState<OverlayStateSnapshot>(initialState);

  useEffect(() => {
    let mounted = true;
    const url = `/api/overlay/${encodeURIComponent(slug)}/state`;

    const timer = setInterval(() => {
      fetch(url, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((next: OverlayStateSnapshot | null) => {
          if (mounted && next) setLive(next);
        })
        .catch(() => {
          // Keep showing the last valid card on transient network failures
        });
    }, POLL_MS);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [slug]);

  const effectivePlatform = platformOverride ?? live.platform;
  const allowQr = isQrAllowedOnPlatform(effectivePlatform);

  let active = offers[0] ?? null;
  if (codeOverride) {
    const clean = codeOverride.replace(/^#/, "").toLowerCase();
    const byCode = offers.find((o) => o.code.toLowerCase() === clean);
    if (byCode) active = byCode;
  } else if (live.activeCardId) {
    const byId = offers.find((o) => o.id === live.activeCardId);
    if (byId) active = byId;
  }

  const isDark = theme === "dark";

  return (
    <>
      {!previewBg && (
        <style>{"html, body { background: transparent !important; background-color: transparent !important; }"}</style>
      )}
      <div className={`min-h-screen p-5 flex items-start justify-end ${previewBg ? "bg-surface" : "bg-transparent"}`}>
        {!live.overlayHidden && active && (
          <div
            className={`${allowQr ? "w-[215px]" : "w-[196px]"} rounded-3xl p-4 text-center shadow-2xl backdrop-blur-md border ${
              isDark
                ? "bg-black/75 border-white/20 text-white"
                : "bg-card/95 border-line text-ink"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest opacity-75">
              {merchantName}
            </div>

            {allowQr && (
              <div className="mt-2 inline-block rounded-2xl bg-white p-2 shadow-sm">
                <div
                  className="h-[144px] w-[144px] [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: active.qrSvg }}
                />
              </div>
            )}

            <div className="mt-2 font-mono text-sm font-bold tracking-wide uppercase">
              #{active.code}
            </div>
            <div className="mt-0.5 truncate text-xs font-medium opacity-90">{active.title}</div>
            <div className="mt-1 text-lg font-bold">{fmt.format(active.priceDzd)} DA</div>

            {allowQr && (
              <div className="mt-2 inline-block rounded-full bg-card px-3 py-1 text-[11px] font-bold text-ink">
                {active.shortLabel}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
