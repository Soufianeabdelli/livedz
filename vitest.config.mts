import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.local" });

export default defineConfig({
  resolve: { alias: { "@": path.resolve(process.cwd(), "src"), "server-only": path.resolve(process.cwd(), "src/test-stubs/server-only.ts") } },
  test: {
    env: { DATABASE_URL: process.env.DATABASE_URL ?? "" },
    fileParallelism: false, // DB tests must not run at the same time
  },
});