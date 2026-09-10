import type { Metadata } from "next";
import { CheckCircle, XCircle, Clock, AlertTriangle, ShieldCheck, Share2, Printer, ExternalLink } from "lucide-react";
import { verificationService } from "@/modules/verification/verification.service";

export const dynamic = "force-dynamic";

interface VerifyCredentialPageProps {
  params: Promise<{ credentialId: string }>;
}

export async function generateMetadata({
  params,
}: VerifyCredentialPageProps): Promise<Metadata> {
  const { credentialId } = await params;
  return {
    title: `Verify ${credentialId.toUpperCase()} | Youth Empowerment Hub`,
    description: `Official digital credential verification portal for Youth Empowerment Hub.`,
    robots: { index: false, follow: false },
  };
}

export default async function VerifyCredentialPage({
  params,
}: VerifyCredentialPageProps) {
  const { credentialId } = await params;
  const cleanId = credentialId.toUpperCase().trim();
  const result = await verificationService.verify(cleanId);

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Credential ID badge */}
      <div className="text-center">
        <span className="inline-block bg-white text-gray-700 text-xs font-mono font-bold px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
          CREDENTIAL ID: {cleanId}
        </span>
      </div>

      {/* Result card */}
      {result.outcome === "VALID" && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500/30 shadow-xl overflow-hidden">
          {/* Official Verification Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-6 text-white flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/30">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold tracking-wider uppercase text-emerald-100">
                  Official Verification
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white">Credential Verified Authentic ✓</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Issued by Youth Empowerment Hub and recorded on the verification registry.
              </p>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="p-6 space-y-4">
            <div className="border-b border-gray-100 pb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Certified Recipient
              </span>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {result.credential.recipientName}
              </h3>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Award / Certification" value={result.credential.title} highlight />
              {result.credential.role && <Row label="Role / Designation" value={result.credential.role} />}
              {result.credential.program && <Row label="Program / Track" value={result.credential.program} />}
              {result.credential.duration && <Row label="Program Duration" value={result.credential.duration} />}
              {result.credential.issueDate && (
                <Row
                  label="Issue Date"
                  value={new Date(result.credential.issueDate).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
              )}
              {result.credential.expiresAt && (
                <Row
                  label="Valid Until"
                  value={new Date(result.credential.expiresAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
              )}
              <Row label="Issuing Authority" value={result.credential.issuer} />
              <Row label="Official Serial Number" value={result.credential.credentialId} mono />
            </div>

            {/* Industry Trust Seal */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Cryptographically verified against the YEH Credential Registry</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {result.outcome === "REVOKED" && (
        <div className="bg-white rounded-2xl border-2 border-red-500/40 shadow-xl overflow-hidden">
          <div className="bg-red-600 px-6 py-6 text-white flex items-center gap-4">
            <XCircle className="w-12 h-12 text-white flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-red-200">
                Security Alert
              </span>
              <h2 className="text-xl font-bold text-white">Credential Revoked</h2>
              <p className="text-xs text-red-100 mt-0.5">
                This credential was formally invalidated by the issuing authority and is no longer valid.
              </p>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <Row label="Credential ID" value={result.credentialId} mono />
            {result.revokedAt && (
              <Row
                label="Revocation Date"
                value={new Date(result.revokedAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            )}
          </div>
        </div>
      )}

      {result.outcome === "EXPIRED" && (
        <div className="bg-white rounded-2xl border-2 border-amber-500/40 shadow-xl overflow-hidden">
          <div className="bg-amber-600 px-6 py-6 text-white flex items-center gap-4">
            <Clock className="w-12 h-12 text-white flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-amber-200">
                Status Notice
              </span>
              <h2 className="text-xl font-bold text-white">Credential Expired</h2>
              <p className="text-xs text-amber-100 mt-0.5">
                This credential was authentic but has exceeded its validity period.
              </p>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <Row label="Credential ID" value={result.credentialId} mono />
            {result.expiresAt && (
              <Row
                label="Expiration Date"
                value={new Date(result.expiresAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            )}
          </div>
        </div>
      )}

      {(result.outcome === "NOT_FOUND" || result.outcome === "VERIFICATION_DISABLED") && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
          <div className="bg-gray-800 px-6 py-6 text-white flex items-center gap-4">
            <AlertTriangle className="w-12 h-12 text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
                Registry Notice
              </span>
              <h2 className="text-xl font-bold text-white">Credential Record Not Found</h2>
              <p className="text-xs text-gray-300 mt-0.5">
                No active record matches this Credential ID in the Youth Empowerment Hub registry.
              </p>
            </div>
          </div>
          <div className="p-6 text-sm text-gray-600 space-y-3">
            <p>
              Please verify the certificate serial number on your physical or digital document. If you believe this is
              an error, contact the issuing team at:
            </p>
            <div className="p-3 bg-gray-50 rounded-lg font-mono text-xs text-blue-700">
              support: credentials@youthempowerment.in
            </div>
          </div>
        </div>
      )}

      {/* Try another */}
      <div className="text-center pt-2">
        <a href="/verify" className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
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
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 sm:gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span
        className={`text-sm ${highlight ? "font-bold text-blue-900" : "font-semibold text-gray-900"} ${
          mono ? "font-mono text-xs bg-gray-100 px-2 py-0.5 rounded border" : ""
        } text-left sm:text-right`}
      >
        {value}
      </span>
    </div>
  );
}
