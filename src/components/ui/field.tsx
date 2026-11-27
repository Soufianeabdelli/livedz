import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "./cn";

const control =
  "min-h-[48px] w-full rounded-[var(--radius-control)] border border-line bg-card px-4 py-2.5 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type Base = { label: string; hint?: string; error?: string };

export function TextField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? props.name ?? label;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(control, error && "border-danger", className)}
        {...props}
      />
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id,
  className,
  children,
  ...props
}: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? props.name ?? label;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(control, error && "border-danger", className)}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}