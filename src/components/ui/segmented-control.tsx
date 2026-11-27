"use client";

import { cn } from "./cn";

export type SegmentOption = { value: string; label: string; hint?: string };

export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: SegmentOption[];
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-[48px] flex-col items-center justify-center rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              selected
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-card text-ink hover:border-accent",
            )}
          >
            <span>{o.label}</span>
            {o.hint ? (
              <span className={cn("text-[11px] font-medium", selected ? "opacity-90" : "text-muted")}>
                {o.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}