import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { analyticsService } from "@/modules/analytics/analytics.service";
import { prisma } from "@/infrastructure/db/prisma";
import { BarChart3, Award, Users, ShieldCheck, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { organizationId: string };

  const [stats, verificationsCount, typeBreakdown] = await Promise.all([
    analyticsService.getDashboardStats(user.organizationId),
    prisma.verificationLog.count({
      where: { credential: { organizationId: user.organizationId } },
    }),
    prisma.credential.groupBy({
      by: ["credentialTypeId"],
      where: { organizationId: user.organizationId },
      _count: true,
    }),
  ]);

  const credentialTypes = await prisma.credentialType.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, name: true },
  });

  const typeMap = new Map(credentialTypes.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Insights</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time metrics on credential generation, verification velocity, and program participation.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Credentials</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalCredentials}</p>
          <p className="text-xs text-green-600 font-medium mt-1">
            +{stats.issuedThisMonth} issued this month
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Participants</p>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalParticipants}</p>
          <p className="text-xs text-gray-400 mt-1">Registered recipients</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase">QR Verifications</p>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{verificationsCount}</p>
          <p className="text-xs text-green-600 font-medium mt-1">Live scan inquiries</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase">Pending Imports</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingImports}</p>
          <p className="text-xs text-gray-400 mt-1">Batches awaiting review</p>
        </div>
      </div>

      {/* Distribution by Type */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Issuance by Credential Type</h2>
        <div className="space-y-3">
          {typeBreakdown.map((t) => {
            const typeName = typeMap.get(t.credentialTypeId) || "Other";
            const percent = stats.totalCredentials > 0 ? (t._count / stats.totalCredentials) * 100 : 0;
            return (
              <div key={t.credentialTypeId} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>{typeName}</span>
                  <span>
                    {t._count} ({percent.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}

          {typeBreakdown.length === 0 && (
            <p className="text-xs text-gray-400">No credentials issued yet to display distribution.</p>
          )}
        </div>
      </div>
    </div>
  );
}
