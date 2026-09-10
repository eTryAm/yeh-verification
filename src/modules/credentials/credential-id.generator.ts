import { prisma } from "@/infrastructure/db/prisma";

/**
 * Generate the next concurrency-safe credential ID.
 * Format: {idPrefix}-{year}-{sequence padded to 6 digits}
 * Example: YEH-CA-2026-000001
 *
 * Uses a PostgreSQL advisory lock to prevent race conditions.
 * Never uses MAX(id)+1.
 */
export async function generateCredentialId(
  organizationId: string,
  credentialTypeId: string,
  idPrefix: string
): Promise<string> {
  const year = new Date().getFullYear();

  const result = await prisma.$transaction(async (tx) => {
    // Acquire an advisory lock scoped to this (org, type, year)
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${`seq:${organizationId}:${credentialTypeId}:${year}`})
      )
    `;

    // Atomically upsert + increment the sequence
    const rows = await tx.$queryRaw<Array<{ last_sequence: number }>>`
      INSERT INTO credential_sequences (id, organization_id, credential_type_id, year, last_sequence)
      VALUES (gen_random_uuid(), ${organizationId}, ${credentialTypeId}, ${year}, 1)
      ON CONFLICT (organization_id, credential_type_id, year)
      DO UPDATE SET last_sequence = credential_sequences.last_sequence + 1
      RETURNING last_sequence
    `;

    return rows[0]?.last_sequence ?? 1;
  });

  const padded = String(result).padStart(6, "0");
  return `${idPrefix}-${year}-${padded}`;
}
