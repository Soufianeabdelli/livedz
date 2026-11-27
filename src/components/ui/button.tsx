import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink shadow-sm hover:opacity-95",
  secondary: "border border-line bg-card text-ink hover:border-accent",
  danger: "bg-danger text-white hover:opacity-95",
  ghost: "text-ink hover:bg-soft",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}