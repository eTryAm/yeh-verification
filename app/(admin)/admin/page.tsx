import type { Metadata } from "next";
import { analyticsService } from "@/modules/analytics/analytics.service";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { Award, Users, Upload, TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { organizationId: string; name?: string };
  const stats = await analyticsService.getDashboardStats(user.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user.name ?? "Admin"}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Credentials"
          value={stats.totalCredentials}
          icon={Award}
          color="bg-blue-500"
        />
        <StatCard
          label="Issued This Month"
          value={stats.issuedThisMonth}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          label="Total Participants"
          value={stats.totalParticipants}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          label="Pending Imports"
          value={stats.pendingImports}
          icon={Upload}
          color="bg-amber-500"
        />
      </div>

      {/* Credentials by Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Credentials by Status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.credentialsByStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border">
              <span className="text-sm font-medium text-gray-700">{status}</span>
              <span className="text-sm font-bold text-gray-900">{count}</span>
            </div>
          ))}
          {Object.keys(stats.credentialsByStatus).length === 0 && (
            <p className="text-sm text-gray-400">No credentials issued yet.</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Issuance Activity (Last 30 Days)</h2>
        {stats.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet.</p>
        ) : (
          <div className="space-y-1">
            {stats.recentActivity.slice(-10).map(({ date, count }) => (
              <div key={date} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">{date}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (count / Math.max(...stats.recentActivity.map((a) => a.count))) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
