/**
 * Lightweight session check for use in proxy/middleware.
 * Does NOT import Node.js modules (crypto, etc.) — safe for Edge runtime.
 * Reads the session cookie directly without touching the DB.
 */
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function getSessionFromRequest(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });
    if (token) return token;
  } catch (err) {
    console.error("[Session] Error decoding token:", err);
  }

  // Fallback: check if standard Auth.js session cookies are present
  const sessionCookie =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (sessionCookie) {
    return { authenticated: true };
  }

  return null;
}
