import { type NextRequest } from "next/server";
import { z } from "zod";
import { featureFlagsService } from "@/modules/feature-flags/feature-flags.service";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { ok, handleRouteError } from "@/lib/api-response";
import type { FeatureFlagKey } from "@/modules/feature-flags/feature-flags.constants";

export async function GET(_request: NextRequest) {
  try {
    const user = await requirePermission(Permission.SETTINGS_MANAGE);
    const flags = await featureFlagsService.getAllFlags(user.organizationId);
    return ok(flags);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.SETTINGS_MANAGE);
    const body = await request.json();

    const schema = z.object({
      key: z.string(),
      isEnabled: z.boolean(),
    });
    const { key, isEnabled } = schema.parse(body);

    await featureFlagsService.setFlag(
      user.organizationId,
      key as FeatureFlagKey,
      isEnabled,
      user.id
    );

    return ok({ key, isEnabled });
  } catch (err) {
    return handleRouteError(err);
  }
}
