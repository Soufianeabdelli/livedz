export type V = { id: string; label: string; available: boolean };

export function VariantPicker({ variants, invalid }: { variants: V[]; invalid: boolean }) {
  return (
    <fieldset className={`rounded border p-3 ${invalid ? "border-red-500" : "border-gray-400"}`}>
      <legend className="px-1 font-medium">Pointure</legend>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <label
            key={v.id}
            className={`cursor-pointer rounded border px-3 py-2 has-[:checked]:bg-black has-[:checked]:text-white ${v.available ? "" : "line-through opacity-40"}`}
          >
            <input type="radio" name="variantId" value={v.id} disabled={!v.available} required className="sr-only" />
            {v.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}