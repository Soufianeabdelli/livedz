import { Demo } from "../demo";
import { GlassPanel, Sheet, ThemeShell } from "@/components/ui/glass";

export default function GlassDesignPage() {
  return (
    <ThemeShell>
      <GlassPanel className="sticky top-0 z-10 px-4 py-3">
        <p className="mx-auto max-w-md font-serif text-lg font-semibold">PinCasting</p>
      </GlassPanel>
      <main className="mx-auto w-full max-w-md space-y-5 px-4 py-6">
        <h1 className="font-serif text-2xl font-semibold">Glass theme</h1>
        <Demo />
      </main>
      <Sheet className="mx-auto w-full max-w-md px-5 pb-10 pt-4">
        <p className="text-sm text-muted">Bottom sheet sample (solid card, no blur).</p>
      </Sheet>
    </ThemeShell>
  );
}