import type { Metadata } from "next";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import type { VerificationResult } from "@/modules/credentials/credential.types";

interface VerifyCredentialPageProps {
  params: Promise<{ credentialId: string }>;
}

export async function generateMetadata({
  params,
}: VerifyCredentialPageProps): Promise<Metadata> {
  const { credentialId } = await params;
  return {
    title: `Verify ${credentialId}`,
    robots: { index: false, follow: false },
  };
}

async function getVerificationResult(credentialId: string): Promise<VerificationResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/v1/verification/${credentialId}`, {
    cache: "no-store",
  });
  const json = await res.json();
  return json.data as VerificationResult;
}

export default async function VerifyCredentialPage({
  params,
}: VerifyCredentialPageProps) {
  const { credentialId } = await params;
  const result = await getVerificationResult(credentialId.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Credential ID badge */}
      <div className="text-center">
        <span className="inline-block bg-gray-100 text-gray-600 text-xs font-mono px-3 py-1 rounded-full border">
          {credentialId.toUpperCase()}
        </span>
      </div>

      {/* Result card */}
      {result.outcome === "VALID" && (
        <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm overflow-hidden">
          <div className="bg-green-50 px-6 py-5 flex items-center gap-4 border-b border-green-200">
            <CheckCircle className="w-10 h-10 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-green-800">Credential Verified ✓</h2>
              <p className="text-sm text-green-600">This credential is authentic and valid.</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-3">
            <Row label="Recipient" value={result.credential.recipientName} />
            <Row label="Award" value={result.credential.title} />
            {result.credential.role && <Row label="Role" value={result.credential.role} />}
            {result.credential.program && <Row label="Program" value={result.credential.program} />}
            {result.credential.duration && <Row label="Duration" value={result.credential.duration} />}
            {result.credential.issueDate && (
              <Row label="Issue Date" value={new Date(result.credential.issueDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} />
            )}
            {result.credential.expiresAt && (
              <Row label="Valid Until" value={new Date(result.credential.expiresAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} />
            )}
            <Row label="Issued By" value={result.credential.issuer} />
            <Row label="Credential ID" value={result.credential.credentialId} mono />
          </div>
        </div>
      )}

      {result.outcome === "REVOKED" && (
        <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
          <div className="bg-red-50 px-6 py-5 flex items-center gap-4 border-b border-red-200">
            <XCircle className="w-10 h-10 text-red-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-red-800">Credential Revoked</h2>
              <p className="text-sm text-red-600">This credential has been revoked and is no longer valid.</p>
            </div>
          </div>
          {result.revokedAt && (
            <div className="px-6 py-4">
              <Row label="Revoked On" value={new Date(result.revokedAt).toLocaleDateString("en-IN")} />
            </div>
          )}
        </div>
      )}

      {result.outcome === "EXPIRED" && (
        <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 px-6 py-5 flex items-center gap-4 border-b border-amber-200">
            <Clock className="w-10 h-10 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-amber-800">Credential Expired</h2>
              <p className="text-sm text-amber-600">This credential is no longer valid — it has passed its expiry date.</p>
            </div>
          </div>
          {result.expiresAt && (
            <div className="px-6 py-4">
              <Row label="Expired On" value={new Date(result.expiresAt).toLocaleDateString("en-IN")} />
            </div>
          )}
        </div>
      )}

      {(result.outcome === "NOT_FOUND" || result.outcome === "VERIFICATION_DISABLED") && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-5 flex items-center gap-4 border-b border-gray-200">
            <AlertTriangle className="w-10 h-10 text-gray-500 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Credential Not Found</h2>
              <p className="text-sm text-gray-500">
                No credential was found for this ID, or verification is not available.
              </p>
            </div>
          </div>
          <div className="px-6 py-4 text-sm text-gray-500">
            Please check the Credential ID and try again, or contact{" "}
            <a href="mailto:credentials@youthempowerment.in" className="text-blue-600 underline">
              credentials@youthempowerment.in
            </a>
            .
          </div>
        </div>
      )}

      {/* Try another */}
      <div className="text-center">
        <a href="/verify" className="text-sm text-blue-600 hover:underline">
          ← Verify another credential
        </a>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium text-gray-900 text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
