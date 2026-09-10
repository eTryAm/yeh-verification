import { prisma } from "@/infrastructure/db/prisma";
import type { NormalizedRecord } from "../adapters/base.adapter";
import type { DuplicateMatchType } from "@prisma/client";

export interface DedupResult {
  matchType: DuplicateMatchType;
  matchedParticipantId?: string;
  candidateIds?: string[];
}

/**
 * Multi-signal duplicate detection.
 * Priority: exact email match → phone match → name+institution fuzzy match.
 * Ambiguous matches go to conflict review — never silently merge.
 */
export async function detectDuplicate(
  organizationId: string,
  normalized: NormalizedRecord
): Promise<DedupResult> {
  // Signal 1: Exact email match
  if (normalized.email) {
    const byEmail = await prisma.participant.findFirst({
      where: { organizationId, email: normalized.email },
      select: { id: true },
    });
    if (byEmail) {
      return { matchType: "EXACT", matchedParticipantId: byEmail.id };
    }
  }

  // Signal 2: Exact phone match
  if (normalized.phone) {
    const byPhone = await prisma.participant.findFirst({
      where: { organizationId, phone: normalized.phone },
      select: { id: true },
    });
    if (byPhone) {
      // Phone-only match is LIKELY (could be family member sharing phone)
      return { matchType: "LIKELY", matchedParticipantId: byPhone.id };
    }
  }

  // Signal 3: Name + institution fuzzy match (POSSIBLE)
  if (normalized.firstName && normalized.institution) {
    const candidates = await prisma.participant.findMany({
      where: {
        organizationId,
        firstName: { equals: normalized.firstName, mode: "insensitive" },
        lastName: { equals: normalized.lastName, mode: "insensitive" },
        institution: { equals: normalized.institution, mode: "insensitive" },
      },
      select: { id: true },
      take: 5,
    });

    if (candidates.length === 1) {
      return { matchType: "POSSIBLE", matchedParticipantId: candidates[0].id };
    }
    if (candidates.length > 1) {
      return {
        matchType: "POSSIBLE",
        candidateIds: candidates.map((c) => c.id),
      };
    }
  }

  return { matchType: "NONE" };
}
