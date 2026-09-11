import { type NextRequest } from "next/server";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { prisma } from "@/infrastructure/db/prisma";
import { generateCredentialId } from "@/modules/credentials/credential-id.generator";
import { generateParticipantCode } from "@/lib/participant-code.generator";
import { generateSecureToken } from "@/lib/crypto";
import { auditService } from "@/modules/audit/audit.service";
import { ok, handleRouteError, errorResponse } from "@/lib/api-response";
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
      return errorResponse("NOT_FOUND", "Import batch not found", 404);
    }

    const meta = (batch.metadata || {}) as {
      credentialTypeId?: string;
      credentialTypeCode?: string;
      programName?: string;
      credentialTitle?: string;
    };

    // 1. Resolve or create CredentialType
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

    // 2. Resolve or create Program
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

    // 3. Fetch rows to issue
    const rows = await prisma.importRow.findMany({
      where: { batchId, status: { in: ["VALID", "DUPLICATE"] } },
    });

    let issued = 0;
    let skipped = 0;

    for (const row of rows) {
      const norm = (row.normalizedData || {}) as {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        institution?: string;
        course?: string;
        programCode?: string;
      };

      try {
        let participantId: string;
        const cleanEmail = norm.email ? norm.email.trim().toLowerCase() : null;

        const existing = cleanEmail
          ? await prisma.participant.findFirst({
              where: { organizationId: user.organizationId, email: cleanEmail },
            })
          : null;

        if (existing) {
          participantId = existing.id;
          // Backfill participantCode, institution, course, phone if missing
          const updates: Record<string, unknown> = {};
          if (!existing.participantCode) {
            updates.participantCode = await generateParticipantCode();
          }
          if (!existing.institution && norm.institution) {
            updates.institution = norm.institution;
          }
          if (!existing.course && norm.course) {
            updates.course = norm.course;
          }
          if (!existing.phone && norm.phone) {
            updates.phone = norm.phone;
          }

          if (Object.keys(updates).length > 0) {
            await prisma.participant.update({
              where: { id: existing.id },
              data: updates,
            });
          }
        } else {
          const participantCode = await generateParticipantCode();
          const p = await prisma.participant.create({
            data: {
              organizationId: user.organizationId,
              participantCode,
              firstName: norm.firstName || "Participant",
              lastName: norm.lastName || "",
              email: cleanEmail,
              phone: norm.phone || null,
              institution: norm.institution || null,
              course: norm.course || null,
            },
          });
          participantId = p.id;
        }

        // Avoid duplicate credential for the same program
        if (programId) {
          const alreadyIssued = await prisma.credential.findFirst({
            where: { participantId, programId, organizationId: user.organizationId },
          });
          if (alreadyIssued) {
            skipped++;
            continue;
          }
        }

        const recipientName = [norm.firstName, norm.lastName].filter(Boolean).join(" ") || "Participant";
        const credentialId = await generateCredentialId(
          user.organizationId,
          credentialType.id,
          credentialType.idPrefix
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
      } catch (e) {
        console.error("Failed to issue row:", e);
        skipped++;
      }
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: "COMPLETED",
        importedRows: issued,
        approvedRows: issued,
        completedAt: new Date(),
      },
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