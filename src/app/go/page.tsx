import { Suspense } from "react";
import { GoForm } from "./go-form";

type Props = { searchParams: Promise<{ code?: string }> };

export default function GoPage({ searchParams }: Props) {
  return (
    <div className="min-h-screen bg-surface px-4 py-10 flex items-center justify-center">
      <main className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-card p-6 sm:p-7 shadow-[var(--shadow-card)]">
        <Suspense fallback={<p className="text-center text-sm text-muted">Loading...</p>}>
          <GoContent searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function GoContent({ searchParams }: Props) {
  const { code } = await searchParams;
  return <GoForm initialCode={code ?? ""} />;
}
