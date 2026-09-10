import { type NextRequest } from "next/server";
import { verificationService } from "@/modules/verification/verification.service";
import { verificationRateLimiter } from "@/lib/rate-limit";
import { ok, errorResponse, handleRouteError } from "@/lib/api-response";
import { RateLimitError } from "@/lib/errors";

/**
 * GET /api/v1/verification/[credentialId]
 * Public — no authentication required. Rate limited: 10 req/min/IP.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  try {
    const { credentialId } = await params;

    if (!credentialId || typeof credentialId !== "string") {
      return errorResponse("VALIDATION_ERROR", "Invalid credential ID", 422);
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    try {
      verificationRateLimiter.check(`verify:${ip}`);
    } catch (err) {
      if (err instanceof RateLimitError) {
        return errorResponse(err.code, err.message, 429);
      }
    }

    const result = await verificationService.verify(credentialId.toUpperCase(), {
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    const cacheControl =
      result.outcome === "VALID"
        ? "public, max-age=60, stale-while-revalidate=30"
        : "no-store";

    const response = ok(result);
    response.headers.set("Cache-Control", cacheControl);
    return response;
  } catch (err) {
    return handleRouteError(err);
  }
}
