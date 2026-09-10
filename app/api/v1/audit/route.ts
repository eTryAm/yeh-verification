import { type NextRequest } from "next/server";
import { auditService } from "@/modules/audit/audit.service";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { ok, handleRouteError } from "@/lib/api-response";
import { parsePaginationParams } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.AUDIT_VIEW);
    const { searchParams } = new URL(request.url);
    const params = parsePaginationParams(searchParams);

    const filters = {
      actorId: searchParams.get("actorId") ?? undefined,
      resourceType: searchParams.get("resourceType") ?? undefined,
      resourceId: searchParams.get("resourceId") ?? undefined,
    };

    const result = await auditService.list(user.organizationId, params, filters);
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
