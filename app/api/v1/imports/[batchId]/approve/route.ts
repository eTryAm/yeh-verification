import { type NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { prisma } from "@/infrastructure/db/prisma";
import { generateCredentialId } from "@/modules/credentials/credential-id.generator";
import { generateParticipantCode } from "@/lib/participant-code.generator";
import { generateSecureToken } from "@/lib/crypto";
import { auditService } from "@/modules/audit/audit.service";
import { ok, handleRouteError } from "@/lib/api-response";
import { CredentialStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await requirePermission(Permission.IMPORT_APPROVE);
    const { batchId } = await params;

    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, organizationId: user.organizationId },
    });
    if (!batch) {
      return handleRouteError(Object.assign(new Error("Import batch not found"), { code: "NOT_FOUND", statusCode: 404 }));
    }

    const meta = batch.metadata as {
      credentialTypeId?: string;
      credentialTypeCode?: string;
      programName?: string;
      credentialTitle?: string;
    };

    let credentialType = meta.credentialTypeId
      ? await prisma.credentialType.findUnique({ where: { id: meta.credentialTypeId } })
      : null;

    if (!credentialType) {
      const code = (meta.credentialTypeCode || "CERTIFICATE") as never;
      credentialType = await prisma.credentialType.findFirst({
        where: { organizationId: user.organizationId, code },
      });
      if (!credentialType) {
        credentialType = await prisma.credentialType.create({
          data: {
            organizationId: user.organizationId,
            code,
            name: String(meta.credentialTypeCode || "CERTIFICATE").replace(/_/g, " "),
            idPrefix: "YEH-" + String(meta.credentialTypeCode || "CERT").slice(0, 4),
          },
        });
      }
    }

    let programId: string | null = null;
    if (meta.programName && meta.programName.trim()) {
      const trimmed = meta.programName.trim();
      let program = await prisma.program.findFirst({
        where: { organizationId: user.organizationId, name: trimmed },
      });
      if (!program) {
        const programCode = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 20);
        program = await prisma.program.create({
          data: { organizationId: user.organizationId, name: trimmed, programCode: programCode || "PROG" },
        });
      }
      programId = program.id;
    }

    const rows = await prisma.importRow.findMany({
      where: { batchId, status: { in: ["VALID", "DUPLICATE"] } },
    });

    let issued = 0;
    let skipped = 0;

    for (const row of rows) {
      const norm = row.normalizedData as {
        firstName?: string; lastName?: string;
        email?: string; phone?: string; institution?: string; course?: string;
      };

      try {
        let participantId: string;
        const existing = norm.email
          ? await prisma.participant.findFirst({
              where: { organizationId: user.organizationId, email: norm.email },
            })
          : null;

        if (existing) {
          participantId = existing.id;
        } else {
          const participantCode = await generateParticipantCode();
          const p = await prisma.participant.create({
            data: {
              organizationId: user.organizationId,
              participantCode,
              firstName: norm.firstName || "Unknown",
              lastName: norm.lastName || "",
              email: norm.email || null,
              phone: norm.phone || null,
              institution: norm.institution || null,
              course: norm.course || null,
            },
          });
          participantId = p.id;
        }

        if (programId) {
          const alreadyIssued = await prisma.credential.findFirst({
            where: { participantId, programId, organizationId: user.organizationId },
          });
          if (alreadyIssued) { skipped++; continue; }
        }

        const recipientName = [norm.firstName, norm.lastName].filter(Boolean).join(" ") || "Participant";
        const credentialId = await generateCredentialId(
          user.organizationId,
          credentialType!.id,
          credentialType!.idPrefix
        );

        await prisma.$transaction(async (tx) => {
          const cred = await tx.credential.create({
            data: {
              credentialId,
              organizationId: user.organizationId,
              credentialTypeId: credentialType!.id,
              participantId,
              programId,
              title: meta.credentialTitle || "Certificate of Participation",
              recipientName,
              issueDate: new Date(),
              status: CredentialStatus.VALID,
              isVerificationEnabled: true,
              qrToken: generateSecureToken(24),
              issuedBy: user.id,
            },
          });
          await tx.credentialStatusHistory.create({
            data: {
              credentialId: cred.id,
              fromStatus: CredentialStatus.DRAFT,
              toStatus: CredentialStatus.VALID,
              changedBy: user.id,
              reason: "Bulk issued from import batch",
            },
          });
          return cred;
        });

        await prisma.importRow.update({
          where: { id: row.id },
          data: { status: "IMPORTED", approvedBy: user.id, approvedAt: new Date() },
        });
        issued++;
      } catch {
        skipped++;
      }
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: "COMPLETED", importedRows: issued, approvedRows: issued, completedAt: new Date() },
    });

    await auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "IMPORT_APPROVED",
      resourceType: "ImportBatch",
      resourceId: batchId,
      result: "SUCCESS",
      metadata: { issued, skipped },
    });

    return ok({ issued, skipped });
  } catch (err) {
    return handleRouteError(err);
  }
}