import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/db/prisma";
import ImportsClient from "./imports-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data Imports",
};

export default async function ImportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { organizationId: string };

  const batches = await prisma.importBatch.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return <ImportsClient initialBatches={batches as never} />;
}