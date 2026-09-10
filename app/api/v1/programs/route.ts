import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/db/prisma";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { ok, created, handleRouteError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const createProgramSchema = z.object({
  name: z.string().min(2, "Program name must be at least 2 characters"),
  programCode: z.string().min(2, "Program code must be at least 2 characters").max(30),
  description: z.string().max(500).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.PARTICIPANT_VIEW);
    const programs = await prisma.program.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { credentials: true, registrations: true },
        },
      },
    });
    return ok(programs);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.SETTINGS_MANAGE);
    const body = await request.json();
    const input = createProgramSchema.parse(body);

    const program = await prisma.program.create({
      data: {
        organizationId: user.organizationId,
        name: input.name.trim(),
        programCode: input.programCode.toUpperCase().trim(),
        description: input.description?.trim() || null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });

    return created(program);
  } catch (err) {
    return handleRouteError(err);
  }
}
