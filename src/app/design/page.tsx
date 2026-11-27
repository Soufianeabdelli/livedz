import { Demo } from "./demo";

export default function DesignPage() {
  return (
    <div data-theme="emerald" className="min-h-screen bg-surface px-4 py-8 text-ink">
      <main className="mx-auto w-full max-w-md space-y-5">
        <h1 className="font-serif text-2xl font-semibold">Design system</h1>
        <Demo />
      </main>
    </div>
  );
}