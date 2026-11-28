import { Suspense } from "react";
import { cookies } from "next/headers";
import { CustomerPreview } from "./glass-demo";
import { ThemeShell } from "@/components/ui/glass";
import { LanguageSwitcher, ThemeToggle } from "@/components/ui/store-controls";
import { LOCALE_COOKIE, dirFor } from "@/lib/i18n";
import { THEME_COOKIE, resolveStoreLocale, resolveTheme } from "@/lib/store-prefs";

async function Content() {
  const jar = await cookies();
  const theme = resolveTheme(jar.get(THEME_COOKIE)?.value);
  const locale = resolveStoreLocale(jar.get(LOCALE_COOKIE)?.value);
  return (
    <ThemeShell mode={theme} className="px-4 py-6">
      <div dir={dirFor(locale)}>
        <div className="mx-auto mb-3 flex w-full max-w-[420px] items-center justify-between" dir="ltr">
          <LanguageSwitcher current={locale} />
          <ThemeToggle current={theme} />
        </div>
        <CustomerPreview locale={locale} />
      </div>
    </ThemeShell>
  );
}

export default function GlassDesignPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}