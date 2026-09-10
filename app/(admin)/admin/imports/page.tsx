import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/db/prisma";
import { Upload, FileSpreadsheet, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Imports",
};

export default async function ImportsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { organizationId: string };

  const batches = await prisma.importBatch.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      initiator: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Imports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ingest external student rosters, registrations, and batch data via CSV.
          </p>
        </div>
      </div>

      {/* CSV Ingestion Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <Upload className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-gray-900">Bulk CSV Ingestion Engine</h3>
            <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
              Upload recipient CSV files with columns like <code>first_name</code>, <code>last_name</code>,{" "}
              <code>email</code>, <code>phone</code>, <code>institution</code>. The platform automatically normalizes,
              validates, and deduplicates records before staging for batch credential generation.
            </p>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Batch ID</th>
                <th className="px-5 py-3">Filename / Source</th>
                <th className="px-5 py-3">Total Rows</th>
                <th className="px-5 py-3">Valid Rows</th>
                <th className="px-5 py-3">Conflicts</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Uploaded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-800">{b.id.slice(0, 10)}…</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{b.sourceFileName || b.source}</td>
                  <td className="px-5 py-4">{b.totalRows}</td>
                  <td className="px-5 py-4 text-green-700 font-semibold">{b.validRows}</td>
                  <td className="px-5 py-4 text-amber-600 font-semibold">{b.conflictRows}</td>
                  <td className="px-5 py-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {batches.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No import batches uploaded yet.
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
