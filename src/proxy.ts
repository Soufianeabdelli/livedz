import { NextResponse, type NextRequest } from "next/server";
import { CARD_TOKEN_RE } from "@/lib/token";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    // Fast check only. The page still verifies the cookie with Firebase.
    if (!req.cookies.get("__session")?.value) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Validates tokens for both /q/{token} and /l/{sessionToken}
  const token = pathname.split("/")[2] ?? "";
  if (!CARD_TOKEN_RE.test(token)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/q/:path*", "/l/:path*", "/dashboard/:path*"] };
