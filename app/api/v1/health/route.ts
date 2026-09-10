import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    status: "ok" as "ok" | "degraded" | "down",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "unknown",
    database: "unknown" as "ok" | "error",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    checks.status = "degraded";
  }

  const httpStatus = checks.status === "down" ? 503 : 200;
  return NextResponse.json(checks, { status: httpStatus });
}
