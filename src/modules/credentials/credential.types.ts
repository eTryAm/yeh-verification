import type { CredentialStatus, CredentialTypeCode } from "@prisma/client";

/** Public-facing credential data — must NOT include email, phone, internal IDs */
export interface PublicCredentialView {
  credentialId: string;
  title: string;
  recipientName: string;
  credentialType: CredentialTypeCode;
  program?: string;
  role?: string;
  issueDate?: string;
  expiresAt?: string;
  duration?: string;
  issuer: string;
  status: CredentialStatus;
}

export type VerificationResult =
  | { outcome: "VALID"; credential: PublicCredentialView }
  | { outcome: "REVOKED"; credentialId: string; revokedAt?: string }
  | { outcome: "EXPIRED"; credentialId: string; expiresAt?: string }
  | { outcome: "NOT_FOUND" }
  | { outcome: "VERIFICATION_DISABLED" };

export interface CreateCredentialInput {
  credentialTypeId: string;
  templateId?: string;
  templateVersionId?: string;
  participantId: string;
  programId?: string;
  eligibilityId?: string;
  title: string;
  role?: string;
  issueDate?: Date;
  expiresAt?: Date;
  duration?: string;
  metadata?: Record<string, unknown>;
}

export interface RevokeCredentialInput {
  credentialId: string;
  reason: string;
  revokedBy: string;
}
