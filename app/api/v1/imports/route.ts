import { type NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { prisma } from "@/infrastructure/db/prisma";
import { csvAdapter } from "@/modules/ingestion/adapters/csv.adapter";
import { detectDuplicate } from "@/modules/ingestion/pipeline/dedup";
import { ok, created, handleRouteError } from "@/lib/api-response";
import { auditService } from "@/modules/audit/audit.service";

export const dynamic = "force-dynamic";

// GET — list all import batches
export async function GET() {
  try {
    const user = await requirePermission(Permission.IMPORT_CREATE);
    const batches = await prisma.importBatch.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        initiator: { select: { name: true } },
        _count: { select: { rows: true } },
      },
    });
    return ok(batches);
  } catch (err) {
    return handleRouteError(err);
  }
}

// POST — upload CSV and create an import batch
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.IMPORT_CREATE);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const credentialTypeCode = (formData.get("credentialTypeCode") as string) || "CERTIFICATE";
    const programName = (formData.get("programName") as string) || "";
    const credentialTitle = (formData.get("credentialTitle") as string) || "Certificate of Participation";

    if (!file) {
      return handleRouteError(new Error("No file uploaded"));
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse CSV using existing adapter
    const rawRecords = await csvAdapter.fetch({ fileBuffer: buffer });
    const normalized = rawRecords.map((r) => csvAdapter.normalize(r));

    let totalRows = normalized.length;
    let validRows = 0;
    let invalidRows = 0;
    let conflictRows = 0;

    // Find or create credential type
    let credentialType = await prisma.credentialType.findFirst({
      where: { organizationId: user.organizationId, code: credentialTypeCode as never },
    });
    if (!credentialType) {
      credentialType = await prisma.credentialType.create({
        data: {
          organizationId: user.organizationId,
          code: credentialTypeCode as never,
          name: credentialTypeCode.replace(/_/g, " "),
          idPrefix: "YEH-" + credentialTypeCode.slice(0, 4),
        },
      });
    }

    // Create the import batch
    const batch = await prisma.importBatch.create({
      data: {
        organizationId: user.organizationId,
        source: "CSV",
        initiatedBy: user.id,
        status: "STAGING",
        totalRows,
        sourceFileName: file.name,
        metadata: {
          credentialTypeCode,
          credentialTypeId: credentialType.id,
          programName,
          credentialTitle,
        } as never,
      },
    });

    // Process each row: validate + deduplicate
    const rowPromises = normalized.map(async (norm, index) => {
      const validation = csvAdapter.validate(norm);
      const dedup = await detectDuplicate(user.organizationId, norm);

      const isConflict = dedup.matchType === "POSSIBLE" || dedup.matchType === "LIKELY";
      const isValid = validation.isValid && !isConflict;
      const isDuplicate = dedup.matchType === "EXACT";

      if (isValid || isDuplicate) validRows++;
      else if (isConflict) conflictRows++;
      else invalidRows++;

      let status: string = "VALID";
      if (!validation.isValid) status = "INVALID";
      else if (isDuplicate) status = "DUPLICATE";
      else if (isConflict) status = "CONFLICT";

      return prisma.importRow.create({
        data: {
          batchId: batch.id,
          rowIndex: index,
          status: status as never,
          rawData: norm.metadata as never,
          normalizedData: {
            firstName: norm.firstName,
            lastName: norm.lastName,
            email: norm.email,
            phone: norm.phone,
            institution: norm.institution,
            course: norm.course,
          } as never,
          matchType: dedup.matchType,
          matchedParticipantId: dedup.matchedParticipantId,
          validationErrors: validation.errors as never,
        },
      });
    });

    await Promise.all(rowPromises);

    // Update batch with counts
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "AWAITING_APPROVAL",
        validRows,
        invalidRows,
        conflictRows,
      },
    });

    await auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "IMPORT_CREATED",
      resourceType: "ImportBatch",
      resourceId: batch.id,
      result: "SUCCESS",
      metadata: { fileName: file.name, totalRows, validRows, invalidRows },
    });

    return created({ batchId: batch.id, totalRows, validRows, invalidRows, conflictRows });
  } catch (err) {
    return handleRouteError(err);
  }
}