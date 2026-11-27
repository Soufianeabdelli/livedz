import { CustomerPreview } from "./glass-demo";
import { ThemeShell } from "@/components/ui/glass";

export default function GlassDesignPage() {
  return (
    <ThemeShell className="px-4 py-8">
      <CustomerPreview />
    </ThemeShell>
  );
}