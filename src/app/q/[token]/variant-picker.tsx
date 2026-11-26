export type V = { id: string; label: string; available: boolean };

export function VariantPicker({
  variants,
  invalid,
  label = "Option",
}: {
  variants: V[];
  invalid: boolean;
  label?: string;
}) {
  return (
    <fieldset className={`rounded-[var(--radius-control)] border bg-surface p-3 ${invalid ? "border-danger" : "border-line"}`}>
      <legend className="px-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {variants.map((v) => (
          <label
            key={v.id}
            className={`cursor-pointer rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink ${
              v.available ? "" : "cursor-not-allowed line-through opacity-40"
            }`}
          >
            <input type="radio" name="variantId" value={v.id} disabled={!v.available} required className="sr-only" />
            {v.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
