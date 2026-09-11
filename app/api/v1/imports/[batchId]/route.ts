import { type NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { prisma } from "@/infrastructure/db/prisma";
import { ok, handleRouteError, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET — view batch details and its rows with validation statuses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await requirePermission(Permission.IMPORT_CREATE);
    const { batchId } = await params;

    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, organizationId: user.organizationId },
      include: {
        initiator: { select: { name: true, email: true } },
        rows: {
          orderBy: { rowIndex: "asc" },
          take: 200,
        },
      },
    });

    if (!batch) {
      return errorResponse("NOT_FOUND", "Import batch not found", 404);
    }

    return ok(batch);
  } catch (err) {
    return handleRouteError(err);
  }
}

// DELETE — cleanly remove an import batch and its staged rows
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await requirePermission(Permission.IMPORT_REJECT);
    const { batchId } = await params;

    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, organizationId: user.organizationId },
    });

    if (!batch) {
      return errorResponse("NOT_FOUND", "Import batch not found", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.importError.deleteMany({ where: { batchId } });
      await tx.importRow.deleteMany({ where: { batchId } });
      await tx.importBatch.delete({ where: { id: batchId } });
    });

    return ok({ deleted: true, batchId });
  } catch (err) {
    return handleRouteError(err);
  }
}