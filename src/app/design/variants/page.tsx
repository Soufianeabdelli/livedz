import { Suspense } from "react";
import { cookies } from "next/headers";
import { GlassCard, ThemeShell } from "@/components/ui/glass";
import { LanguageSwitcher, ThemeToggle } from "@/components/ui/store-controls";
import { VariantChips } from "@/components/ui/variant-chips";
import { LOCALE_COOKIE, dirFor } from "@/lib/i18n";
import { THEME_COOKIE, resolveStoreLocale, resolveTheme } from "@/lib/store-prefs";
import type { VariantInput } from "@/lib/variant-groups";

// Sample data only: real stock comes from the database in the next block
const SHOES: VariantInput[] = [
  { id: "s1", size: "38", color: "Black", available: 3 },
  { id: "s2", size: "39", color: "Black", available: 0 },
  { id: "s3", size: "40", color: "Black", available: 8 },
  { id: "s4", size: "41", color: "Black", available: 2 },
  { id: "s5", size: "38", color: "White", available: 5 },
  { id: "s6", size: "40", color: "White", available: 0 },
];
const DRESS: VariantInput[] = [
  { id: "d1", size: "S", color: "Red", available: 4 },
  { id: "d2", size: "M", color: "Red", available: 9 },
  { id: "d3", size: "XL", color: "Red", available: 1 },
  { id: "d4", size: "L", color: "Green", available: 6 },
];
const STRAP: VariantInput[] = [{ id: "w1", size: "", color: "", available: 12 }];

async function Content() {
  const jar = await cookies();
  const theme = resolveTheme(jar.get(THEME_COOKIE)?.value);
  const locale = resolveStoreLocale(jar.get(LOCALE_COOKIE)?.value);
  const samples = [
    { key: "shoes", title: "Shoes (color and size)", variants: SHOES },
    { key: "dress", title: "Dress (color and size)", variants: DRESS },
    { key: "strap", title: "Watch strap (no picker)", variants: STRAP },
  ];
  return (
    <ThemeShell mode={theme} className="px-4 py-6">
      <div dir={dirFor(locale)}>
        <div className="mx-auto mb-3 flex w-full max-w-[420px] items-center justify-between" dir="ltr">
          <LanguageSwitcher current={locale} />
          <ThemeToggle current={theme} />
        </div>
        <div className="mx-auto w-full max-w-[420px] space-y-4">
          {samples.map((s) => (
            <GlassCard key={s.key} className="space-y-2 p-4">
              <h2 className="text-sm font-extrabold">{s.title}</h2>
              <VariantChips variants={s.variants} locale={locale} />
            </GlassCard>
          ))}
        </div>
      </div>
    </ThemeShell>
  );
}

export default function VariantsDesignPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}