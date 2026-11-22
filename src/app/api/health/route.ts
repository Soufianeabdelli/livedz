import { connection } from "next/server";

export async function GET() {
  // Required because Cache Components is enabled
  await connection();

  return Response.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
