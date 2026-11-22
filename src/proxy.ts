import { NextResponse, type NextRequest } from "next/server";
import { CARD_TOKEN_RE } from "@/lib/token";

export function proxy(req: NextRequest) {
  const token = req.nextUrl.pathname.split("/")[2] ?? "";
  if (!CARD_TOKEN_RE.test(token)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/q/:path*"] };