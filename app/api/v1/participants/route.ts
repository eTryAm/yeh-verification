import { type NextRequest } from "next/server";
import { z } from "zod";
import { participantService } from "@/modules/participants/participant.service";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { ok, created, handleRouteError } from "@/lib/api-response";
import { parsePaginationParams } from "@/lib/pagination";

const createParticipantSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().default(""),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  institution: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  graduationYear: z.number().int().min(1990).max(2050).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.PARTICIPANT_VIEW);
    const { searchParams } = new URL(request.url);
    const params = parsePaginationParams(searchParams);
    const search = searchParams.get("search") ?? undefined;
    const result = await participantService.list(user, params, search);
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

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.PARTICIPANT_UPDATE);
    const body = await request.json();
    const input = createParticipantSchema.parse(body);
    const participant = await participantService.create(input, user);
    return created(participant);
  } catch (err) {
    return handleRouteError(err);
  }
}
