import { connection, NextResponse } from "next/server";
import { getOverlayStateBySlug } from "@/lib/overlay-state";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  await connection();
  const { slug } = await context.params;
  const state = await getOverlayStateBySlug(slug);
  if (!state) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
