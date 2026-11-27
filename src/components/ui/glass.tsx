import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function ThemeShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-theme="glass" className={cn("glass-bg min-h-screen text-ink", className)}>
      {children}
    </div>
  );
}

// Use only for the sticky header and the bottom navigation bar
export function GlassPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-blur border-b border-line", className)} {...props} />;
}

export function Sheet({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-t-[28px] border border-b-0 border-line bg-card shadow-[var(--shadow-sheet)]",
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
      {children}
    </div>
  );
}