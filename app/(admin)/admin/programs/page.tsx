import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/db/prisma";
import { ProgramsClient } from "./programs-client";

export const metadata: Metadata = {
  title: "Programs",
};

export default async function ProgramsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { organizationId: string };

  const programs = await prisma.program.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { credentials: true, registrations: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <ProgramsClient
        initialPrograms={programs.map((p) => ({
          id: p.id,
          name: p.name,
          programCode: p.programCode,
          description: p.description,
          startDate: p.startDate ? new Date(p.startDate).toLocaleDateString() : null,
          endDate: p.endDate ? new Date(p.endDate).toLocaleDateString() : null,
          isActive: p.isActive,
          credentialsCount: p._count.credentials,
          registrationsCount: p._count.registrations,
          createdAt: new Date(p.createdAt).toLocaleDateString(),
        }))}
      />
    </div>
  );
}
