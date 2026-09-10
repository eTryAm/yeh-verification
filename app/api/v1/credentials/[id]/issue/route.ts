import { type NextRequest } from "next/server";
import { credentialService } from "@/modules/credentials/credential.service";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { ok, handleRouteError } from "@/lib/api-response";

/**
 * POST /api/v1/credentials/[id]/issue
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(Permission.CREDENTIAL_ISSUE);
    const { id } = await params;
    const result = await credentialService.issue(id, user);
    return ok(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
