import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export function ThemeShell({ children, className, mode = "dark" }: { children: ReactNode; className?: string; mode?: "dark" | "light" }) {
  return (
    <div data-theme="glass" data-mode={mode} className={cn("g-bg min-h-screen text-ink", className)}>
      {children}
    </div>
  );
}

export function GlassPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("g-panel", className)} {...props} />;
}

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("g-card", className)} {...props} />;
}

export function Sheet({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("g-sheet", className)} {...props}>
      <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
      {children}
    </div>
  );
}

export function GlassButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn("g-btn inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-extrabold", className)}
      {...props}
    />
  );
}

export function GlassBadge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("g-badge inline-flex rounded-full px-2.5 py-0.5 text-[11px]", className)} {...props} />;
}

type FieldBase = { label: string; hint?: string };

export function GlassInput({ label, hint, id, className, ...props }: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? props.name ?? label;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-xs font-bold text-emerald-100/90">{label}</label>
        {hint ? <span className="g-num text-[11px] text-emerald-200/70">{hint}</span> : null}
      </div>
      <input id={fieldId} className={cn("g-input min-h-[48px] w-full rounded-xl px-3.5 py-2.5 text-base", className)} {...props} />
    </div>
  );
}

export function GlassSelect({ label, id, className, children, ...props }: FieldBase & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? props.name ?? label;
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="block text-xs font-bold text-emerald-100/90">{label}</label>
      <select id={fieldId} className={cn("g-input min-h-[48px] w-full rounded-xl px-3 py-2.5 text-base", className)} {...props}>
        {children}
      </select>
    </div>
  );
}