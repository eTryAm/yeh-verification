import { prisma } from "@/infrastructure/db/prisma";

/**
 * Generate the next concurrency-safe credential ID.
 * Format: {idPrefix}-{year}-{sequence padded to 6 digits}
 * Example: YEH-CERT-2026-000001
 *
 * Uses atomic sequence upsert to guarantee sequential, collision-free numbering.
 */
export async function generateCredentialId(
  organizationId: string,
  credentialTypeId: string,
  idPrefix: string
): Promise<string> {
  const year = new Date().getFullYear();

  const seq = await prisma.$transaction(async (tx) => {
    return tx.credentialSequence.upsert({
      where: {
        organizationId_credentialTypeId_year: {
          organizationId,
          credentialTypeId,
          year,
        },
      },
      create: {
        organizationId,
        credentialTypeId,
        year,
        lastSequence: 1,
      },
      update: {
        lastSequence: { increment: 1 },
      },
    });
  });

  const padded = String(seq.lastSequence).padStart(6, "0");
  return `${idPrefix}-${year}-${padded}`;
}
