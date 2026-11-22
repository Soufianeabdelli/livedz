import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma does not read .env.local automatically (only Next.js does)
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});