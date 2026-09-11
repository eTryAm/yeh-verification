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
    let programName = (formData.get("programName") as string) || "";
    const credentialTitle = (formData.get("credentialTitle") as string) || "Certificate of Participation";

    if (!file) {
      return handleRouteError(new Error("No CSV file uploaded"));
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Parse and normalize CSV using smart alias matcher
    const rawRecords = await csvAdapter.fetch({ fileBuffer: buffer });
    const normalized = rawRecords.map((r) => csvAdapter.normalize(r));

    if (normalized.length === 0) {
      return handleRouteError(new Error("The CSV file is empty or has no readable rows"));
    }

    // Auto-detect program/event name from CSV opportunity_name if not provided manually
    if (!programName.trim()) {
      const detectedProgram = normalized.find((n) => n.programCode)?.programCode;
      if (detectedProgram) {
        programName = detectedProgram;
      }
    }

    // 2. Find or create CredentialType
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

    // 3. Create ImportBatch
    const batch = await prisma.importBatch.create({
      data: {
        organizationId: user.organizationId,
        source: "CSV",
        initiatedBy: user.id,
        status: "STAGING",
        totalRows: normalized.length,
        sourceFileName: file.name,
        metadata: {
          credentialTypeCode,
          credentialTypeId: credentialType.id,
          programName: programName.trim(),
          credentialTitle: credentialTitle.trim(),
        } as never,
      },
    });

    // 4. Validate & detect duplicates for each row
    let validCount = 0;
    let invalidCount = 0;
    let conflictCount = 0;

    const rowInserts = await Promise.all(
      normalized.map(async (norm, index) => {
        const validation = csvAdapter.validate(norm);
        const dedup = await detectDuplicate(user.organizationId, norm);

        const isConflict = dedup.matchType === "POSSIBLE" || dedup.matchType === "LIKELY";
        const isDuplicate = dedup.matchType === "EXACT";

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

        return {
          batchId: batch.id,
          rowIndex: index + 1,
          status: status as never,
          rawData: norm.metadata as never,
          normalizedData: {
            firstName: norm.firstName,
            lastName: norm.lastName,
            email: norm.email,
            phone: norm.phone,
            institution: norm.institution,
            course: norm.course,
            programCode: norm.programCode,
          } as never,
          matchType: dedup.matchType,
          matchedParticipantId: dedup.matchedParticipantId,
          validationErrors: validation.errors as never,
        };
      })
    );

    // Persist all rows
    await prisma.importRow.createMany({
      data: rowInserts,
    });

    // Update batch with final counts
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "AWAITING_APPROVAL",
        validRows: validCount,
        invalidRows: invalidCount,
        conflictRows: conflictCount,
      },
    });

    await auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "IMPORT_CREATED",
      resourceType: "ImportBatch",
      resourceId: batch.id,
      result: "SUCCESS",
      metadata: { fileName: file.name, totalRows: normalized.length, validRows: validCount, invalidRows: invalidCount },
    });

    return created({
      batchId: batch.id,
      totalRows: normalized.length,
      validRows: validCount,
      invalidRows: invalidCount,
      conflictRows: conflictCount,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}