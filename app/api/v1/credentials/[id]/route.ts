import { type NextRequest } from "next/server";
import { z } from "zod";
import { credentialService } from "@/modules/credentials/credential.service";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { ok, handleRouteError } from "@/lib/api-response";

/**
 * GET /api/v1/credentials/[id]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(Permission.CREDENTIAL_VIEW);
    const { id } = await params;
    const credential = await credentialService.getById(id, user);
    return ok(credential);
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * PATCH /api/v1/credentials/[id]
 * Update draft credential metadata. Only allowed on DRAFT credentials.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(Permission.CREDENTIAL_CREATE);
    const { id } = await params;
    const body = await request.json();

    const schema = z.object({
      title: z.string().min(1).max(200).optional(),
      role: z.string().max(100).optional(),
      issueDate: z.string().datetime().optional(),
      expiresAt: z.string().datetime().optional(),
      duration: z.string().max(100).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const input = schema.parse(body);
    const credential = await credentialService.getById(id, user);

    if (credential.status !== "DRAFT") {
      const { InvalidStateTransitionError } = await import("@/lib/errors");
      throw new InvalidStateTransitionError(credential.status, "DRAFT", "Only DRAFT credentials can be modified");
    }

    const { prisma } = await import("@/infrastructure/db/prisma");
    const updated = await prisma.credential.update({
      where: { id },
      data: {
        ...input,
        issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        metadata: (input.metadata ?? credential.metadata) as never,
      },
    });

    return ok(updated);
  } catch (err) {
    return handleRouteError(err);
  }
}
