import type { Metadata } from "next";
import { auth } from "@/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/db/prisma";
import { ShieldCheck, CheckCircle2, XCircle, Clock, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Verification Logs",
};

export default async function VerificationLogsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { organizationId: string };

  const logs = await prisma.verificationLog.findMany({
    where: {
      credential: {
        organizationId: user.organizationId,
      },
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
    include: {
      credential: {
        select: {
          credentialId: true,
          recipientName: true,
          title: true,
          status: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verification Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time audit trail of every QR scan and verification attempt across your credentials.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Credential ID</th>
                <th className="px-5 py-3">Recipient & Award</th>
                <th className="px-5 py-3">Outcome</th>
                <th className="px-5 py-3">Anonymized IP</th>
                <th className="px-5 py-3">Device / User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(l.requestedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold text-xs text-blue-700">
                    <a
                      href={`/verify/${l.credential.credentialId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {l.credential.credentialId}
                    </a>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900 text-xs">{l.credential.recipientName}</p>
                    <p className="text-xs text-gray-400">{l.credential.title}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        l.result === "VALID"
                          ? "bg-green-100 text-green-800"
                          : l.result === "REVOKED"
                          ? "bg-red-100 text-red-800"
                          : l.result === "EXPIRED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {l.result === "VALID" && <CheckCircle2 className="w-3 h-3" />}
                      {l.result === "REVOKED" && <XCircle className="w-3 h-3" />}
                      {l.result === "EXPIRED" && <Clock className="w-3 h-3" />}
                      {l.result}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">
                    {l.ipHash ? `${l.ipHash.slice(0, 10)}…` : "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400 max-w-xs truncate" title={l.userAgent || ""}>
                    {l.userAgent || "Browser / Mobile scanner"}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No verification attempts recorded yet. Issue a certificate and scan its QR code to see live verification logs here!
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
