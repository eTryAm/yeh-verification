import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/db/prisma";
import { CredentialsClient } from "./credentials-client";

export const metadata: Metadata = {
  title: "Credentials Management",
};

export default async function CredentialsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { organizationId: string };

  const [credentials, credentialTypes, programs] = await Promise.all([
    prisma.credential.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        credentialType: { select: { code: true, name: true } },
        participant: { select: { firstName: true, lastName: true, email: true } },
        program: { select: { name: true } },
      },
    }),
    prisma.credentialType.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.program.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const verificationBaseUrl =
    process.env.NEXT_PUBLIC_VERIFICATION_BASE_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || ""}/verify`;

  return (
    <div className="space-y-6">
      <CredentialsClient
        initialCredentials={credentials.map((c) => ({
          id: c.id,
          credentialId: c.credentialId,
          title: c.title,
          recipientName: c.recipientName,
          recipientEmail: c.participant.email,
          credentialType: c.credentialType.name,
          program: c.program?.name ?? null,
          role: c.role,
          status: c.status,
          issueDate: c.issueDate ? new Date(c.issueDate).toLocaleDateString() : null,
          createdAt: new Date(c.createdAt).toLocaleDateString(),
          revocationReason: c.revocationReason,
        }))}
        credentialTypes={credentialTypes.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
        }))}
        programs={programs}
        verificationBaseUrl={verificationBaseUrl}
      />
    </div>
  );
}
