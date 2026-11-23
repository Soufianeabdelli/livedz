import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

type Row = { wilayaCode: number; name: string; nameAr: string };

async function main() {
  const rows: Row[] = JSON.parse(readFileSync("data/communes.json", "utf8"));
  const r = await prisma.commune.createMany({ data: rows, skipDuplicates: true });
  console.log("inserted:", r.count, "of", rows.length, "| total in db:", await prisma.commune.count());
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());