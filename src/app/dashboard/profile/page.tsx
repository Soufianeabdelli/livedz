import { Suspense } from "react";
import { prisma as db } from "@/lib/db";
import { requireMerchant } from "@/lib/require-merchant";
import { cookies } from "next/headers";
import { DICT, DEFAULT_LOCALE, LOCALE_COOKIE, dirFor, isLocale } from "@/lib/i18n";
import { StoreProfileForm } from "./store-profile-form";
import { LanguageSwitcher } from "./language-switcher";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = DICT[locale];

  const merchantId = await requireMerchant();
  const profile = await db.storeProfile.findUnique({ where: { merchantId } });

  return (
    <main dir={dirFor(locale)} lang={locale} className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl text-stone-900">{t.title}</h1>
            <p className="mt-2 text-stone-600">{t.subtitle}</p>
          </div>
          <LanguageSwitcher current={locale} label={t.language} />
        </div>
        <div className="mt-10">
          <StoreProfileForm initial={profile} t={t} />
        </div>
      </div>
    </main>
  );
}