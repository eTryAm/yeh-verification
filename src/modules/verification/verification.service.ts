import { prisma } from "@/infrastructure/db/prisma";
import { featureFlagsService } from "@/modules/feature-flags/feature-flags.service";
import { FeatureFlags } from "@/modules/feature-flags/feature-flags.constants";
import { hashIp } from "@/lib/crypto";
import { CredentialStatus } from "@prisma/client";
import type { VerificationResult } from "@/modules/credentials/credential.types";

export class VerificationService {
  /**
   * Look up a credential by its public credentialId and return
   * only the fields safe for public display.
   * Logs each verification attempt in a privacy-conscious manner.
   */
  async verify(
    credentialId: string,
    options?: { ip?: string; userAgent?: string }
  ): Promise<VerificationResult> {
    const credential = await prisma.credential.findUnique({
      where: { credentialId },
      include: {
        credentialType: { select: { code: true, name: true } },
        program: { select: { name: true } },
        organization: { select: { name: true } },
      },
    });

    if (!credential) {
      await this.logVerification(null, "NOT_FOUND", options);
      return { outcome: "NOT_FOUND" };
    }

    // Check if public verification is enabled for this org
    const verificationEnabled = await featureFlagsService.isEnabled(
      credential.organizationId,
      FeatureFlags.PUBLIC_VERIFICATION
    );

    if (!verificationEnabled || !credential.isVerificationEnabled) {
      await this.logVerification(credential.id, "VERIFICATION_DISABLED", options);
      return { outcome: "VERIFICATION_DISABLED" };
    }

    // Check expiry (belt-and-suspenders — job also transitions status)
    if (
      credential.status === CredentialStatus.VALID &&
      credential.expiresAt &&
      credential.expiresAt < new Date()
    ) {
      await this.logVerification(credential.id, "EXPIRED", options);
      return {
        outcome: "EXPIRED",
        credentialId: credential.credentialId,
        expiresAt: credential.expiresAt.toISOString(),
      };
    }

    if (credential.status === CredentialStatus.REVOKED) {
      await this.logVerification(credential.id, "REVOKED", options);
      return {
        outcome: "REVOKED",
        credentialId: credential.credentialId,
        revokedAt: credential.revokedAt?.toISOString(),
      };
    }

    if (credential.status === CredentialStatus.EXPIRED) {
      await this.logVerification(credential.id, "EXPIRED", options);
      return {
        outcome: "EXPIRED",
        credentialId: credential.credentialId,
        expiresAt: credential.expiresAt?.toISOString(),
      };
    }

    if (
      credential.status !== CredentialStatus.VALID &&
      credential.status !== CredentialStatus.ISSUED
    ) {
      // DRAFT, PENDING, SUPERSEDED are not publicly verifiable
      await this.logVerification(credential.id, "NOT_FOUND", options);
      return { outcome: "NOT_FOUND" };
    }

    await this.logVerification(credential.id, "VALID", options);

    return {
      outcome: "VALID",
      credential: {
        credentialId: credential.credentialId,
        title: credential.title,
        recipientName: credential.recipientName,
        credentialType: credential.credentialType.code,
        program: credential.program?.name,
        role: credential.role ?? undefined,
        issueDate: credential.issueDate?.toISOString(),
        expiresAt: credential.expiresAt?.toISOString(),
        duration: credential.duration ?? undefined,
        issuer: credential.organization.name,
        status: credential.status,
      },
    };
  }

  private async logVerification(
    credentialId: string | null,
    result: string,
    options?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    if (!credentialId) return;
    try {
      await prisma.verificationLog.create({
        data: {
          credentialId,
          result,
          ipHash: options?.ip ? hashIp(options.ip) : null,
          userAgent: options?.userAgent?.slice(0, 512) ?? null,
        },
      });
    } catch {
      // Never let logging fail a verification
    }
  }
}

export const verificationService = new VerificationService();
