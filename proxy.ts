import { getSessionFromRequest } from "@/modules/auth/session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 proxy — enforces auth on admin/API routes.
 * Uses Edge-safe JWT session check (no Node.js crypto import).
 * Exported as both `proxy` (new convention) and `middleware` (compat).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPrefixes = [
    "/verify",
    "/login",
    "/api/v1/auth",
    "/api/v1/health",
    "/api/v1/verification",
    "/_next",
    "/favicon.ico",
  ];

  if (publicPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getSessionFromRequest(request);

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
};
