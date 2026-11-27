import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}