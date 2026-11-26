"use client";

import { useActionState, useState } from "react";
import { saveStoreProfile, type ProfileActionState } from "./actions";
import type { Dict, ProfileType } from "@/lib/i18n";

type InitialProfile = {
  displayName: string;
  tagline: string | null;
  category: ProfileType;
  city: string | null;
  whatsapp: string | null;
  accentColor: string;
} | null;

const CATEGORY_VALUES: ProfileType[] = ["SELLER", "SERVICE", "AFFILIATE", "ECOMMERCE"];
const ACCENT_PRESETS = [
  { hex: "#4F5842", label: "Sage Editorial" },
  { hex: "#7A4E2D", label: "Warm Clay" },
  { hex: "#2F2A26", label: "Espresso" },
  { hex: "#2C4A52", label: "Mediterranean Slate" },
];
const initialState: ProfileActionState = { ok: false };

const inputClass =
  "mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-sm text-rose-700">{messages[0]}</p>;
}

export function StoreProfileForm({ initial, t }: { initial: InitialProfile; t: Dict }) {
  const [state, formAction, pending] = useActionState(saveStoreProfile, initialState);
  const initialPreset = ACCENT_PRESETS.some((p) => p.hex.toLowerCase() === initial?.accentColor?.toLowerCase())
    ? (initial?.accentColor ?? "#4F5842")
    : "#4F5842";
  const [accent, setAccent] = useState(initialPreset);

  return (
    <form
      action={formAction}
      className="space-y-7 rounded-3xl border border-line bg-card p-8 shadow-sm"
    >
      <div>
        <label htmlFor="displayName" className="text-sm font-medium text-ink">
          {t.name}
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={initial?.displayName ?? ""}
          className={inputClass}
          required
        />
        <FieldError messages={state.errors?.displayName} />
      </div>

      <div>
        <label htmlFor="tagline" className="text-sm font-medium text-ink">
          {t.tagline}
        </label>
        <input
          id="tagline"
          name="tagline"
          defaultValue={initial?.tagline ?? ""}
          placeholder={t.taglinePlaceholder}
          className={inputClass}
        />
        <FieldError messages={state.errors?.tagline} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="text-sm font-medium text-ink">
            {t.profileType}
          </label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? "SELLER"}
            className={inputClass}
          >
            {Array.from(CATEGORY_VALUES, (value) => (
              <option key={value} value={value}>
                {t.types[value]}
              </option>
            ))}
          </select>
          <FieldError messages={state.errors?.category} />
        </div>

        <div>
          <label htmlFor="city" className="text-sm font-medium text-ink">
            {t.city}
          </label>
          <input
            id="city"
            name="city"
            defaultValue={initial?.city ?? ""}
            placeholder="Algiers"
            className={inputClass}
          />
          <FieldError messages={state.errors?.city} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="whatsapp" className="text-sm font-medium text-ink">
            {t.whatsapp}
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            dir="ltr"
            inputMode="tel"
            defaultValue={initial?.whatsapp ?? ""}
            placeholder="+213 555 123 456"
            className={inputClass}
          />
          <FieldError messages={state.errors?.whatsapp} />
        </div>

        <div>
          <span className="text-sm font-medium text-ink">{t.accentColor}</span>
          <input type="hidden" name="accentColor" value={accent} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Array.from(ACCENT_PRESETS, (p) => {
              const selected = accent.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => setAccent(p.hex)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                    selected ? "border-ink bg-surface ring-2 ring-ink/15" : "border-line bg-card hover:border-muted"
                  }`}
                >
                  <span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: p.hex }} />
                  <span className="truncate text-ink">{p.label}</span>
                </button>
              );
            })}
          </div>
          <FieldError messages={state.errors?.accentColor} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
        <p className="text-sm text-emerald-700" aria-live="polite">
          {state.ok ? t.saved : ""}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-ink transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}
