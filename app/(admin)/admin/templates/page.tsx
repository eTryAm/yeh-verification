import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/db/prisma";
import { FileCheck, Award, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Credential Templates",
};

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { organizationId: string };

  const [types, templates] = await Promise.all([
    prisma.credentialType.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { credentials: true, templates: true } },
      },
    }),
    prisma.credentialTemplate.findMany({
      where: { organizationId: user.organizationId },
      include: {
        credentialType: true,
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credential Types & Templates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configured certificate types, custom ID prefixes, and visual design templates.
        </p>
      </div>

      {/* Credential Types Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Active Credential Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {t.idPrefix}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">
                  Active
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{t.name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">Code: {t.code}</p>
              </div>
              <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-blue-500" />
                  {t._count.credentials} Issued
                </span>
                <span className="font-mono text-[10px] text-gray-400">
                  Format: {t.idPrefix}-YYYY-XXXXXX
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
