import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/infrastructure/db/prisma";
import { auditService } from "@/modules/audit/audit.service";
import { verificationRateLimiter } from "@/lib/rate-limit";
import { safeEqual } from "@/lib/crypto";
import { handleRouteError, ok, errorResponse } from "@/lib/api-response";
import { RateLimitError } from "@/lib/errors";
import { CredentialStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/integration/participant-credentials
 *
 * Service-to-service read-only endpoint for Performance-YEH.
 * Auth: Bearer token via Authorization header (PERFORMANCE_YEH_SERVICE_TOKEN).
 * Never exposes: email, phone, internal DB UUIDs, storage keys, qrToken, revokedBy, issuedBy.
 * Only returns VALID or ISSUED credentials (DRAFT/PENDING/SUPERSEDED are hidden).
 */
export async function GET(request: NextRequest) {
  try {
    // -- 1. Rate limit by IP ---------------------------------------------------
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    try {
      verificationRateLimiter.check(`integration:${ip}`);
    } catch (e) {
      if (e instanceof RateLimitError) {
        return errorResponse("RATE_LIMITED", e.message, 429);
      }
      throw e;
    }

    // -- 2. Authenticate service token (constant-time) -------------------------
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    const expectedToken = process.env.PERFORMANCE_YEH_SERVICE_TOKEN ?? "";
    if (
      !expectedToken ||
      token.length !== expectedToken.length ||
      !safeEqual(token, expectedToken)
    ) {
      return errorResponse(
        "UNAUTHORIZED",
        "Invalid or missing service token",
        401
      );
    }

    // -- 3. Parse query params -------------------------------------------------
    const { searchParams } = request.nextUrl;
    const participantCode = searchParams.get("participantCode")?.trim();
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!participantCode && !email) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Either participantCode or email query parameter is required",
        422
      );
    }

    // -- 4. Look up participant ------------------------------------------------
    const participant = await prisma.participant.findFirst({
      where: participantCode
        ? { participantCode }
        : { email },
      select: { id: true, organizationId: true, participantCode: true },
    });

    if (!participant) {
      return errorResponse(
        "NOT_FOUND",
        "Participant not found",
        404
      );
    }

    // -- 5. Fetch credentials — only publicly verifiable statuses --------------
    const credentials = await prisma.credential.findMany({
      where: {
        participantId: participant.id,
        organizationId: participant.organizationId,
        isVerificationEnabled: true,
        status: { in: [CredentialStatus.VALID, CredentialStatus.ISSUED] },
      },
      orderBy: { issueDate: "desc" },
      select: {
        credentialId: true,
        title: true,
        status: true,
        issueDate: true,
        expiresAt: true,
        duration: true,
        role: true,
        credentialType: { select: { code: true, name: true } },
        program: { select: { name: true } },
        organization: { select: { name: true } },
      },
    });

    // -- 6. Shape the public response — strip any internal fields -------------
    const data = credentials.map((c) => ({
      credentialId: c.credentialId,
      title: c.title,
      credentialType: c.credentialType.code,
      status: c.status,
      issueDate: c.issueDate?.toISOString() ?? null,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      duration: c.duration ?? null,
      role: c.role ?? null,
      program: c.program?.name ?? null,
      issuer: c.organization.name,
    }));

    // -- 7. Audit log — never block response on audit failure ------------------
    void auditService.log({
      organizationId: participant.organizationId,
      actorId: undefined,
      action: "INTEGRATION_CHANGED",
      resourceType: "Integration",
      resourceId: participant.id,
      result: "SUCCESS",
      metadata: {
        caller: "performance-yeh",
        query: participantCode ? { participantCode } : { email: "[redacted]" },
        credentialCount: data.length,
        ip,
      },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
