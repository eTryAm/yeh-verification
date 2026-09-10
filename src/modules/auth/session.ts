/**
 * Lightweight session check for use in proxy/middleware.
 * Does NOT import Node.js modules (crypto, etc.) — safe for Edge runtime.
 * Reads the session cookie directly without touching the DB.
 */
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function getSessionFromRequest(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  return token;
}
