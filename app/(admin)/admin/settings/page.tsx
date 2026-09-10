import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/db/prisma";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Settings & Profile",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as {
    id: string;
    organizationId: string;
    role: string;
    name?: string;
    email?: string;
  };

  const [dbUser, organization, flags] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, slug: true },
    }),
    prisma.featureFlag.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { key: "asc" },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings & Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account credentials, view organization details, and system feature flags.
        </p>
      </div>

      <SettingsClient
        user={{
          name: dbUser?.name ?? user.name ?? "Admin",
          email: dbUser?.email ?? user.email ?? "",
          role: dbUser?.role ?? user.role,
          createdAt: dbUser?.createdAt ? new Date(dbUser.createdAt).toLocaleDateString() : "",
          lastLoginAt: dbUser?.lastLoginAt ? new Date(dbUser.lastLoginAt).toLocaleString() : "First session",
        }}
        organization={{
          name: organization?.name ?? "Youth Empowerment Hub",
          slug: organization?.slug ?? "yeh",
        }}
        flags={flags.map((f) => ({
          key: f.key,
          isEnabled: f.isEnabled,
          description: f.description,
        }))}
      />
    </div>
  );
}
