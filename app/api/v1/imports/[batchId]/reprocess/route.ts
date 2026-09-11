import { type NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { prisma } from "@/infrastructure/db/prisma";
import { csvAdapter } from "@/modules/ingestion/adapters/csv.adapter";
import { detectDuplicate } from "@/modules/ingestion/pipeline/dedup";
import { ok, handleRouteError, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// POST — re-analyze an existing batch with the latest smart column normalizer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await requirePermission(Permission.IMPORT_CREATE);
    const { batchId } = await params;

    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, organizationId: user.organizationId },
      include: { rows: true },
    });

    if (!batch) {
      return errorResponse("NOT_FOUND", "Import batch not found", 404);
    }

    let validCount = 0;
    let invalidCount = 0;
    let conflictCount = 0;

    for (const row of batch.rows) {
      const rawData = (row.rawData || {}) as Record<string, unknown>;
      const rawPayload = (rawData._source_row || rawData) as Record<string, unknown>;

      const normalized = csvAdapter.normalize({
        externalId: row.id,
        rawPayload,
      });

      const validation = csvAdapter.validate(normalized);
      const dedup = await detectDuplicate(user.organizationId, normalized);

      const isConflict = dedup.matchType === "POSSIBLE" || dedup.matchType === "LIKELY";
      const isDuplicate = dedup.matchType === "EXACT";
      const isValid = validation.isValid && !isConflict;

      let status: "VALID" | "INVALID" | "DUPLICATE" | "CONFLICT" = "VALID";
      if (!validation.isValid) {
        status = "INVALID";
        invalidCount++;
      } else if (isDuplicate) {
        status = "DUPLICATE";
        validCount++;
      } else if (isConflict) {
        status = "CONFLICT";
        conflictCount++;
      } else {
        status = "VALID";
        validCount++;
      }

      await prisma.importRow.update({
        where: { id: row.id },
        data: {
          status,
          normalizedData: {
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            email: normalized.email,
            phone: normalized.phone,
            institution: normalized.institution,
            course: normalized.course,
            programCode: normalized.programCode,
          } as never,
          matchType: dedup.matchType,
          matchedParticipantId: dedup.matchedParticipantId,
          validationErrors: validation.errors as never,
        },
      });
    }

    const updatedBatch = await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: "AWAITING_APPROVAL",
        validRows: validCount,
        invalidRows: invalidCount,
        conflictRows: conflictCount,
      },
    });

    return ok({
      batchId,
      totalRows: batch.rows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      conflictRows: conflictCount,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}