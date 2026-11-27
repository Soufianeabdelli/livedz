import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "live" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-soft text-muted",
  live: "bg-rose-600 text-white",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-700",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}