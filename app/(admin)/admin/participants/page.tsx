import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/db/prisma";
import { ParticipantsClient } from "./participants-client";

export const metadata: Metadata = {
  title: "Participants",
};

export default async function ParticipantsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { organizationId: string };

  const participants = await prisma.participant.findMany({
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
      <ParticipantsClient
        initialParticipants={participants.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          phone: p.phone,
          institution: p.institution,
          graduationYear: p.graduationYear,
          city: p.city,
          credentialsCount: p._count.credentials,
          createdAt: new Date(p.createdAt).toLocaleDateString(),
        }))}
      />
    </div>
  );
}
