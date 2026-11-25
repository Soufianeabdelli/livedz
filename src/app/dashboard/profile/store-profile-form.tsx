"use client";

import { useActionState } from "react";
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
const initialState: ProfileActionState = { ok: false };

const inputClass =
  "mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-sm text-rose-700">{messages[0]}</p>;
}

export function StoreProfileForm({ initial, t }: { initial: InitialProfile; t: Dict }) {
  const [state, formAction, pending] = useActionState(saveStoreProfile, initialState);

  return (
    <form
      action={formAction}
      className="space-y-7 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm"
    >
      <div>
        <label htmlFor="displayName" className="text-sm font-medium text-stone-700">
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
        <label htmlFor="tagline" className="text-sm font-medium text-stone-700">
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
          <label htmlFor="category" className="text-sm font-medium text-stone-700">
            {t.profileType}
          </label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? "SELLER"}
            className={inputClass}
          >
            {CATEGORY_VALUES.map((value) => (
              <option key={value} value={value}>
                {t.types[value]}
              </option>
            ))}
          </select>
          <FieldError messages={state.errors?.category} />
        </div>

        <div>
          <label htmlFor="city" className="text-sm font-medium text-stone-700">
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
          <label htmlFor="whatsapp" className="text-sm font-medium text-stone-700">
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
          <label htmlFor="accentColor" className="text-sm font-medium text-stone-700">
            {t.accentColor}
          </label>
          <input
            id="accentColor"
            name="accentColor"
            type="color"
            defaultValue={initial?.accentColor ?? "#8B5E3C"}
            className="mt-2 h-12 w-full cursor-pointer rounded-2xl border border-stone-200 bg-stone-50 p-1"
          />
          <FieldError messages={state.errors?.accentColor} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-stone-100 pt-6">
        <p className="text-sm text-emerald-700" aria-live="polite">
          {state.ok ? t.saved : ""}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-stone-900 px-7 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}