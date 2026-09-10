import { CredentialStatus } from "@prisma/client";
import { InvalidStateTransitionError } from "@/lib/errors";

const ALLOWED_TRANSITIONS: Record<CredentialStatus, CredentialStatus[]> = {
  [CredentialStatus.DRAFT]: [CredentialStatus.PENDING],
  [CredentialStatus.PENDING]: [CredentialStatus.ISSUED],
  [CredentialStatus.ISSUED]: [CredentialStatus.VALID, CredentialStatus.REVOKED],
  [CredentialStatus.VALID]: [
    CredentialStatus.REVOKED,
    CredentialStatus.EXPIRED,
    CredentialStatus.SUPERSEDED,
  ],
  [CredentialStatus.REVOKED]: [],
  [CredentialStatus.EXPIRED]: [],
  [CredentialStatus.SUPERSEDED]: [],
};

export function assertValidTransition(
  from: CredentialStatus,
  to: CredentialStatus
): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) throw new InvalidStateTransitionError(from, to);
}

export function canDelete(status: CredentialStatus): boolean {
  return status === CredentialStatus.DRAFT;
}

export const TERMINAL_STATES: CredentialStatus[] = [
  CredentialStatus.REVOKED,
  CredentialStatus.EXPIRED,
  CredentialStatus.SUPERSEDED,
];

export function isTerminal(status: CredentialStatus): boolean {
  return TERMINAL_STATES.includes(status);
}
