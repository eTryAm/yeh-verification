import { type NextRequest } from "next/server";
import { z } from "zod";
import { credentialService } from "@/modules/credentials/credential.service";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { ok, handleRouteError } from "@/lib/api-response";

const revokeSchema = z.object({
  reason: z
    .string()
    .min(5, "Revocation reason must be at least 5 characters")
    .max(500),
});

/**
 * POST /api/v1/credentials/[id]/revoke
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(Permission.CREDENTIAL_REVOKE);
    const { id } = await params;
    const body = await request.json();
    const { reason } = revokeSchema.parse(body);

    const { prisma } = await import("@/infrastructure/db/prisma");
    const cred = await prisma.credential.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { credentialId: true },
    });

    if (!cred) {
      const { NotFoundError } = await import("@/lib/errors");
      throw new NotFoundError("Credential", id);
    }

    await credentialService.revoke(
      { credentialId: cred.credentialId, reason, revokedBy: user.id },
      user
    );

    return ok({ message: "Credential revoked successfully" });
  } catch (err) {
    return handleRouteError(err);
  }
}
