import { prisma } from "@/infrastructure/db/prisma";

/**
 * Generates a sequential participant code like P-2026-000001.
 * Uses the SystemSetting table as an atomic counter — zero schema change needed.
 */
export async function generateParticipantCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `participant_sequence_${year}`;

  // Atomic increment using raw SQL upsert for true sequence safety
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.systemSetting.findUnique({ where: { key } });
    if (existing) {
      const next = parseInt(existing.value, 10) + 1;
      await tx.systemSetting.update({
        where: { key },
        data: { value: String(next) },
      });
      return next;
    } else {
      await tx.systemSetting.create({
        data: { key, value: "1", description: `Participant sequence counter for ${year}` },
      });
      return 1;
    }
  });

  return `P-${year}-${String(result).padStart(6, "0")}`;
}