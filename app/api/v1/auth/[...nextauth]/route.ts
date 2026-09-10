import { handlers } from "@/modules/auth/auth.config";

// Auth routes require Node.js runtime (not Edge) due to Prisma + crypto usage
export const runtime = "nodejs";

export const { GET, POST } = handlers;
