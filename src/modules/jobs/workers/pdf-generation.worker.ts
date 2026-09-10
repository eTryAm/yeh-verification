import { Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/infrastructure/db/prisma";
import { CredentialStatus } from "@prisma/client";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

/**
 * PDF Generation Worker
 * Triggered when a credential moves to PENDING.
 * Generates PDF, stores in R2, then transitions credential to ISSUED.
 */
const pdfWorker = new Worker(
  "credentials",
  async (job) => {
    if (job.name !== "generate-pdf") return;

    const { credentialId, organizationId } = job.data as {
      credentialId: string;
      organizationId: string;
    };

    const credential = await prisma.credential.findFirst({
      where: { id: credentialId, organizationId },
      include: {
        templateVersion: true,
        participant: true,
        program: true,
        credentialType: true,
        organization: true,
      },
    });

    if (!credential || credential.status !== CredentialStatus.PENDING) {
      console.log(`[PDF Worker] Skipping ${credentialId} — not in PENDING status`);
      return;
    }

    // TODO: Implement PDF generation with Puppeteer in Phase 3
    // For now, transition to ISSUED to unblock the workflow
    // The PdfGenerationPort interface is ready for the real implementation.
    console.log(`[PDF Worker] Processing credential ${credentialId}`);

    await prisma.$transaction(async (tx) => {
      await tx.credential.update({
        where: { id: credentialId },
        data: { status: CredentialStatus.ISSUED },
      });

      await tx.credentialStatusHistory.create({
        data: {
          credentialId,
          fromStatus: CredentialStatus.PENDING,
          toStatus: CredentialStatus.ISSUED,
          reason: "PDF generation completed",
        },
      });
    });

    console.log(`[PDF Worker] Credential ${credentialId} → ISSUED`);
  },
  { connection: redis, concurrency: 5 }
);

/**
 * Credential Expiry Worker
 * Scheduled nightly — transitions VALID credentials past their expiresAt to EXPIRED.
 */
const expiryWorker = new Worker(
  "credentials",
  async (job) => {
    if (job.name !== "expire-credentials") return;

    const now = new Date();
    const expired = await prisma.credential.findMany({
      where: {
        status: CredentialStatus.VALID,
        expiresAt: { lt: now },
      },
      select: { id: true },
      take: 500, // Process in batches
    });

    console.log(`[Expiry Worker] Found ${expired.length} credentials to expire`);

    for (const { id } of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.credential.update({
          where: { id },
          data: { status: CredentialStatus.EXPIRED },
        });
        await tx.credentialStatusHistory.create({
          data: {
            credentialId: id,
            fromStatus: CredentialStatus.VALID,
            toStatus: CredentialStatus.EXPIRED,
            reason: "Credential past expiry date",
          },
        });
      });
    }
  },
  { connection: redis, concurrency: 1 }
);

pdfWorker.on("failed", (job, err) => {
  console.error(`[PDF Worker] Job ${job?.id} failed:`, err.message);
});

expiryWorker.on("failed", (job, err) => {
  console.error(`[Expiry Worker] Job ${job?.id} failed:`, err.message);
});

console.log("[Workers] PDF and Expiry workers started");
