import { connection } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  await connection(); // Required because Cache Components is enabled
  const time = new Date().toISOString();
  const headers = { "Cache-Control": "no-store" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "up", time }, { headers });
  } catch (err) {
    // Log details on the server only, never send them to the client
    console.error("[health] database check failed", err);
    return Response.json({ status: "error", db: "down", time }, { status: 503, headers });
  }
}