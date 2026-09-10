import { type NextRequest } from "next/server";
import { analyticsService } from "@/modules/analytics/analytics.service";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { ok, handleRouteError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const user = await requirePermission(Permission.ANALYTICS_VIEW);
    const stats = await analyticsService.getDashboardStats(user.organizationId);
    return ok(stats);
  } catch (err) {
    return handleRouteError(err);
  }
}
