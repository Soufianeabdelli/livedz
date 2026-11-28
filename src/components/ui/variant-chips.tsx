"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { PAGE_DICT, fill } from "@/lib/i18n-page";
import { groupVariants, resolveVariant, type VariantInput } from "@/lib/variant-groups";
import { cn } from "./cn";

const LOW_STOCK = 5;

export function VariantChips({
  variants,
  locale,
  invalid = false,
}: {
  variants: VariantInput[];
  locale: Locale;
  invalid?: boolean;
}) {
  const t = PAGE_DICT[locale];
  const { colors, hasColor, hasSize } = useMemo(() => groupVariants(variants), [variants]);
  const [color, setColor] = useState(colors.length === 1 ? colors[0].color : "");
  const [size, setSize] = useState("");

  const activeColor = hasColor ? color : (colors[0]?.color ?? "");
  const group = colors.find((c) => c.color === activeColor);
  const chosen = resolveVariant(colors, activeColor, hasSize ? size : "");
  const variantId = chosen && chosen.available > 0 ? chosen.id : "";

  function pickColor(next: string) {
    setColor(next);
    const g = colors.find((c) => c.color === next);
    const still = g?.sizes.find((s) => s.size === size);
    if (!still || still.available === 0) setSize("");
  }

  const off = "cursor-not-allowed line-through opacity-40";

  return (
    <div className={cn("space-y-3 rounded-2xl border p-3", invalid ? "border-rose-500" : "border-white/10")}>
      <input type="hidden" name="variantId" value={variantId} />

      {hasColor ? (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">{t.color}</p>
          <div role="radiogroup" aria-label={t.color} className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c.color}
                type="button"
                role="radio"
                aria-checked={c.color === color}
                disabled={c.available === 0}
                onClick={() => pickColor(c.color)}
                className={cn("g-seg min-h-[44px] rounded-xl px-4 text-sm font-bold", c.available === 0 && off)}
              >
                {c.color}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {hasSize && (!hasColor || group) ? (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">{t.size}</p>
          <div role="radiogroup" aria-label={t.size} className="flex flex-wrap gap-2">
            {(group?.sizes ?? []).map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.size === size}
                disabled={s.available === 0}
                onClick={() => setSize(s.size)}
                className={cn("g-seg g-num min-h-[44px] min-w-[48px] rounded-xl px-3 text-sm font-bold", s.available === 0 && off)}
              >
                {s.size}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {hasColor && !group ? <p className="text-xs opacity-70">{t.chooseColor}</p> : null}
      {group && hasSize && !chosen ? <p className="text-xs opacity-70">{t.chooseSize}</p> : null}
      {chosen && chosen.available === 0 ? <p className="text-xs font-bold text-rose-400">{t.soldOut}</p> : null}
      {chosen && chosen.available > 0 && chosen.available <= LOW_STOCK ? (
        <p className="text-xs font-bold text-amber-400">{fill(t.onlyLeft, chosen.available)}</p>
      ) : null}
    </div>
  );
}