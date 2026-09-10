import { type NextRequest } from "next/server";
import { z } from "zod";
import { credentialService } from "@/modules/credentials/credential.service";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { ok, created, handleRouteError } from "@/lib/api-response";
import { parsePaginationParams } from "@/lib/pagination";
import { CredentialStatus } from "@prisma/client";

const createCredentialSchema = z.object({
  credentialTypeId: z.string().cuid(),
  participantId: z.string().cuid(),
  title: z.string().min(1).max(200),
  templateId: z.string().cuid().optional(),
  templateVersionId: z.string().cuid().optional(),
  programId: z.string().cuid().optional(),
  eligibilityId: z.string().cuid().optional(),
  role: z.string().max(100).optional(),
  issueDate: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  duration: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/v1/credentials
 * List credentials with pagination and optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.CREDENTIAL_VIEW);
    const { searchParams } = new URL(request.url);
    const params = parsePaginationParams(searchParams);

    const filters = {
      status: searchParams.get("status") as CredentialStatus | null ?? undefined,
      credentialTypeId: searchParams.get("credentialTypeId") ?? undefined,
      participantId: searchParams.get("participantId") ?? undefined,
      programId: searchParams.get("programId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };

    const result = await credentialService.list(user, params, filters);
    return ok(result.items, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * POST /api/v1/credentials
 * Create a new credential draft.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.CREDENTIAL_CREATE);
    const body = await request.json();
    const input = createCredentialSchema.parse(body);

    const credential = await credentialService.createDraft(
      {
        ...input,
        issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
      user
    );

    return created(credential);
  } catch (err) {
    return handleRouteError(err);
  }
}
