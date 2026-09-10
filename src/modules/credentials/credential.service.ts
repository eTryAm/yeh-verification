import { prisma } from "@/infrastructure/db/prisma";
import { generateCredentialId } from "./credential-id.generator";
import { assertValidTransition, canDelete } from "./credential.lifecycle";
import { auditService } from "@/modules/audit/audit.service";
import { featureFlagsService } from "@/modules/feature-flags/feature-flags.service";
import { FeatureFlags } from "@/modules/feature-flags/feature-flags.constants";
import { getJobAdapter } from "@/modules/jobs/bullmq.adapter";
import { Queues, Jobs } from "@/modules/jobs/job.port";
import { generateSecureToken } from "@/lib/crypto";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  FeatureDisabledError,
} from "@/lib/errors";
import type { SessionUser } from "@/modules/rbac/enforce";
import type { CreateCredentialInput, RevokeCredentialInput } from "./credential.types";
import type { PaginationParams } from "@/lib/pagination";
import { paginationToSkipTake, toPaginatedResult } from "@/lib/pagination";
import { CredentialStatus } from "@prisma/client";

export class CredentialService {
  // ─── Read ──────────────────────────────────────────────────────────────────

  async getById(id: string, user: SessionUser) {
    const credential = await prisma.credential.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        credentialType: true,
        participant: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        program: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        templateVersion: { select: { id: true, version: true, label: true } },
        statusHistory: { orderBy: { createdAt: "desc" } },
        files: true,
      },
    });
    if (!credential) throw new NotFoundError("Credential", id);
    return credential;
  }

  async list(
    user: SessionUser,
    params: PaginationParams,
    filters?: {
      status?: CredentialStatus;
      credentialTypeId?: string;
      participantId?: string;
      programId?: string;
      search?: string;
    }
  ) {
    const where = {
      organizationId: user.organizationId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.credentialTypeId
        ? { credentialTypeId: filters.credentialTypeId }
        : {}),
      ...(filters?.participantId
        ? { participantId: filters.participantId }
        : {}),
      ...(filters?.programId ? { programId: filters.programId } : {}),
      ...(filters?.search
        ? {
            OR: [
              {
                credentialId: {
                  contains: filters.search,
                  mode: "insensitive" as const,
                },
              },
              {
                recipientName: {
                  contains: filters.search,
                  mode: "insensitive" as const,
                },
              },
              {
                title: { contains: filters.search, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.credential.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationToSkipTake(params),
        include: {
          credentialType: { select: { name: true, code: true } },
          participant: { select: { firstName: true, lastName: true } },
          program: { select: { name: true } },
        },
      }),
      prisma.credential.count({ where }),
    ]);

    return toPaginatedResult(items, total, params);
  }

  // ─── Create (DRAFT) ────────────────────────────────────────────────────────

  async createDraft(input: CreateCredentialInput, user: SessionUser) {
    await featureFlagsService.assertEnabled(
      user.organizationId,
      FeatureFlags.CREDENTIAL_ISSUANCE
    );

    // Fetch credential type for ID prefix
    const credentialType = await prisma.credentialType.findFirst({
      where: { id: input.credentialTypeId, organizationId: user.organizationId, isActive: true },
    });
    if (!credentialType) throw new NotFoundError("CredentialType", input.credentialTypeId);

    // Fetch participant — must belong to same org
    const participant = await prisma.participant.findFirst({
      where: { id: input.participantId, organizationId: user.organizationId },
    });
    if (!participant) throw new NotFoundError("Participant", input.participantId);

    // Generate immutable credential ID
    const credentialId = await generateCredentialId(
      user.organizationId,
      credentialType.id,
      credentialType.idPrefix
    );

    const credential = await prisma.$transaction(async (tx) => {
      const cred = await tx.credential.create({
        data: {
          credentialId,
          organizationId: user.organizationId,
          credentialTypeId: input.credentialTypeId,
          templateId: input.templateId,
          templateVersionId: input.templateVersionId,
          participantId: input.participantId,
          programId: input.programId,
          eligibilityId: input.eligibilityId,
          title: input.title,
          recipientName: `${participant.firstName} ${participant.lastName}`,
          role: input.role,
          issueDate: input.issueDate,
          expiresAt: input.expiresAt,
          duration: input.duration,
          metadata: (input.metadata ?? {}) as never,
          status: CredentialStatus.DRAFT,
        },
      });

      // Record initial status history
      await tx.credentialStatusHistory.create({
        data: {
          credentialId: cred.id,
          toStatus: CredentialStatus.DRAFT,
          changedBy: user.id,
          reason: "Credential created",
        },
      });

      return cred;
    });

    await auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "CREDENTIAL_CREATED",
      resourceType: "Credential",
      resourceId: credential.id,
      result: "SUCCESS",
      metadata: { credentialId: credential.credentialId },
    });

    return credential;
  }

  // ─── Issue (DRAFT → PENDING → async job → ISSUED) ─────────────────────────

  async issue(id: string, user: SessionUser) {
    await featureFlagsService.assertEnabled(
      user.organizationId,
      FeatureFlags.CREDENTIAL_ISSUANCE
    );

    const credential = await this.getById(id, user);
    assertValidTransition(credential.status, CredentialStatus.PENDING);

    const qrEnabled = await featureFlagsService.isEnabled(
      user.organizationId,
      FeatureFlags.QR_VERIFICATION
    );
    const qrToken = qrEnabled ? generateSecureToken(24) : null;

    // Transition to PENDING
    await prisma.$transaction(async (tx) => {
      await tx.credential.update({
        where: { id },
        data: {
          status: CredentialStatus.PENDING,
          issueDate: credential.issueDate ?? new Date(),
          ...(qrToken ? { qrToken } : {}),
          issuedBy: user.id,
        },
      });

      await tx.credentialStatusHistory.create({
        data: {
          credentialId: id,
          fromStatus: CredentialStatus.DRAFT,
          toStatus: CredentialStatus.PENDING,
          changedBy: user.id,
          reason: "Submitted for issuance",
        },
      });
    });

    // Enqueue async PDF + QR generation
    const jobAdapter = getJobAdapter();
    const jobId = await jobAdapter.enqueue(
      Queues.CREDENTIALS,
      Jobs.GENERATE_PDF,
      { credentialId: id, organizationId: user.organizationId },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 }, jobId: `pdf:${id}` }
    );

    await auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "CREDENTIAL_ISSUED",
      resourceType: "Credential",
      resourceId: id,
      result: "SUCCESS",
      metadata: { jobId },
    });

    return { id, status: CredentialStatus.PENDING, jobId };
  }

  // ─── Revoke ────────────────────────────────────────────────────────────────

  async revoke(input: RevokeCredentialInput, user: SessionUser) {
    const credential = await prisma.credential.findFirst({
      where: { credentialId: input.credentialId, organizationId: user.organizationId },
    });
    if (!credential) throw new NotFoundError("Credential", input.credentialId);

    assertValidTransition(credential.status, CredentialStatus.REVOKED);

    if (!input.reason?.trim()) {
      throw new ValidationError("Revocation reason is required");
    }

    await prisma.$transaction(async (tx) => {
      await tx.credential.update({
        where: { id: credential.id },
        data: {
          status: CredentialStatus.REVOKED,
          revokedBy: user.id,
          revokedAt: new Date(),
          revocationReason: input.reason,
          isVerificationEnabled: false,
        },
      });

      await tx.credentialStatusHistory.create({
        data: {
          credentialId: credential.id,
          fromStatus: credential.status,
          toStatus: CredentialStatus.REVOKED,
          changedBy: user.id,
          reason: input.reason,
        },
      });
    });

    await auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "CREDENTIAL_REVOKED",
      resourceType: "Credential",
      resourceId: credential.id,
      result: "SUCCESS",
      metadata: { reason: input.reason },
    });
  }

  // ─── Bulk Issue ────────────────────────────────────────────────────────────

  async bulkIssue(credentialIds: string[], user: SessionUser) {
    await featureFlagsService.assertEnabled(
      user.organizationId,
      FeatureFlags.BULK_ISSUANCE
    );

    const jobAdapter = getJobAdapter();
    const jobId = await jobAdapter.enqueue(
      Queues.CREDENTIALS,
      Jobs.BULK_ISSUE,
      { credentialIds, organizationId: user.organizationId, issuedBy: user.id },
      { attempts: 1, jobId: `bulk:${user.organizationId}:${Date.now()}` }
    );

    return { jobId, count: credentialIds.length };
  }
}

export const credentialService = new CredentialService();
