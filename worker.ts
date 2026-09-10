/**
 * Worker process entry point.
 * Run this separately from the Next.js process:
 *   npx tsx worker.ts
 *
 * In production, use PM2 or a process manager:
 *   pm2 start worker.ts --interpreter=tsx
 */

import "./src/modules/jobs/workers/pdf-generation.worker";

console.log("[Worker] YEH Credential Platform workers started");
console.log("[Worker] Listening for jobs on Redis:", process.env.REDIS_URL ?? "redis://localhost:6379");
