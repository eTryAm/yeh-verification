import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/db/prisma";
import { requirePermission } from "@/modules/rbac/enforce";
import { Permission } from "@/modules/rbac/permissions";
import { generateCredentialId } from "@/modules/credentials/credential-id.generator";
import { generateSecureToken } from "@/lib/crypto";
import { auditService } from "@/modules/audit/audit.service";
import { created, errorResponse, handleRouteError } from "@/lib/api-response";
import { CredentialStatus, CredentialTypeCode } from "@prisma/client";

export const dynamic = "force-dynamic";

const directIssueSchema = z.object({
  recipientName: z.string().min(2, "Recipient name must be at least 2 characters"),
  recipientEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  recipientPhone: z.string().max(20).optional().or(z.literal("")),
  recipientInstitution: z.string().max(200).optional().or(z.literal("")),
  title: z.string().min(3, "Title must be at least 3 characters"),
  credentialTypeCode: z.nativeEnum(CredentialTypeCode).default(CredentialTypeCode.CERTIFICATE),
  role: z.string().max(100).optional().or(z.literal("")),
  duration: z.string().max(100).optional().or(z.literal("")),
  programName: z.string().max(200).optional().or(z.literal("")),
  issueDate: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(Permission.CREDENTIAL_ISSUE);
    const body = await request.json();
    const input = directIssueSchema.parse(body);

    const organizationId = user.organizationId;

    // 1. Find or create CredentialType
    let credentialType = await prisma.credentialType.findFirst({
      where: { organizationId, code: input.credentialTypeCode },
    });

    if (!credentialType) {
      credentialType = await prisma.credentialType.create({
        data: {
          organizationId,
          code: input.credentialTypeCode,
          name: input.credentialTypeCode.replace(/_/g, " "),
          idPrefix: `YEH-${input.credentialTypeCode.slice(0, 4)}`,
        },
      });
    }

    // 2. Find or create Participant
    let participantId: string;
    const cleanEmail = input.recipientEmail ? input.recipientEmail.trim().toLowerCase() : null;

    if (cleanEmail) {
      const existing = await prisma.participant.findFirst({
        where: { organizationId, email: cleanEmail },
      });
      if (existing) {
        participantId = existing.id;
      } else {
        const nameParts = input.recipientName.trim().split(" ");
        const firstName = nameParts[0] || input.recipientName;
        const lastName = nameParts.slice(1).join(" ") || "";
        const createdParticipant = await prisma.participant.create({
          data: {
            organizationId,
            firstName,
            lastName,
            email: cleanEmail,
            phone: input.recipientPhone || null,
            institution: input.recipientInstitution || null,
          },
        });
        participantId = createdParticipant.id;
      }
    } else {
      const nameParts = input.recipientName.trim().split(" ");
      const firstName = nameParts[0] || input.recipientName;
      const lastName = nameParts.slice(1).join(" ") || "";
      const createdParticipant = await prisma.participant.create({
        data: {
          organizationId,
          firstName,
          lastName,
          phone: input.recipientPhone || null,
          institution: input.recipientInstitution || null,
        },
      });
      participantId = createdParticipant.id;
    }

    // 3. Find or create Program (if specified)
    let programId: string | null = null;
    if (input.programName && input.programName.trim()) {
      const trimmedProgram = input.programName.trim();
      let program = await prisma.program.findFirst({
        where: { organizationId, name: trimmedProgram },
      });
      if (!program) {
        const programCode = trimmedProgram
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "-")
          .slice(0, 20);
        program = await prisma.program.create({
          data: {
            organizationId,
            name: trimmedProgram,
            programCode: programCode || "PROG",
          },
        });
      }
      programId = program.id;
    }

    // 4. Generate unique, sequential Credential ID (e.g. YEH-CERT-2026-000001)
    const credentialId = await generateCredentialId(
      organizationId,
      credentialType.id,
      credentialType.idPrefix
    );

    const qrToken = generateSecureToken(24);
    const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    // 5. Create credential with VALID status
    const credential = await prisma.$transaction(async (tx) => {
      const cred = await tx.credential.create({
        data: {
          credentialId,
          organizationId,
          credentialTypeId: credentialType.id,
          participantId,
          programId,
          title: input.title.trim(),
          recipientName: input.recipientName.trim(),
          role: input.role ? input.role.trim() : null,
          duration: input.duration ? input.duration.trim() : null,
          issueDate,
          expiresAt,
          status: CredentialStatus.VALID,
          isVerificationEnabled: true,
          qrToken,
          issuedBy: user.id,
        },
        include: {
          credentialType: true,
          program: true,
        },
      });

      await tx.credentialStatusHistory.create({
        data: {
          credentialId: cred.id,
          fromStatus: CredentialStatus.DRAFT,
          toStatus: CredentialStatus.VALID,
          changedBy: user.id,
          reason: "Direct issuance by administrator",
        },
      });

      return cred;
    });

    // 6. Audit log
    await auditService.log({
      organizationId,
      actorId: user.id,
      action: "CREDENTIAL_ISSUED",
      resourceType: "Credential",
      resourceId: credential.id,
      result: "SUCCESS",
      metadata: { credentialId: credential.credentialId, title: credential.title },
    });

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const origin = host
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_APP_URL || "https://youthempowerment.in";
    const verificationUrl = `${origin}/verify/${credential.credentialId}`;

    return created({
      credential,
      verificationUrl,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
