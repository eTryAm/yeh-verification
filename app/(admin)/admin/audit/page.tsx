import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/db/prisma";
import { ClipboardList, CheckCircle, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Audit Logs",
};

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { organizationId: string };

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tamper-evident, immutable activity trail recording all administrative actions.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Resource</th>
                <th className="px-5 py-3">Result</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900 text-xs">{l.actor?.name || "System"}</p>
                    <p className="text-[11px] text-gray-400">{l.actor?.email || "system@yeh"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-700">
                    <span className="font-semibold">{l.resourceType}</span>
                    {l.resourceId && (
                      <span className="block font-mono text-[10px] text-gray-400">
                        {l.resourceId.slice(0, 12)}…
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        l.result === "SUCCESS" ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {l.result === "SUCCESS" ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                      )}
                      {l.result}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500 font-mono max-w-xs truncate">
                    {JSON.stringify(l.metadata)}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No audit logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
