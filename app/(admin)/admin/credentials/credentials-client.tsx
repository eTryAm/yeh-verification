"use client";

import { useState } from "react";
import {
  Award,
  Plus,
  Search,
  QrCode,
  ExternalLink,
  Ban,
  CheckCircle2,
  Copy,
  Download,
  X,
  AlertCircle,
} from "lucide-react";
import QRCodeLib from "qrcode";

interface CredentialItem {
  id: string;
  credentialId: string;
  title: string;
  recipientName: string;
  recipientEmail: string | null;
  credentialType: string;
  program: string | null;
  role: string | null;
  status: string;
  issueDate: string | null;
  createdAt: string;
  revocationReason: string | null;
}

interface CredentialsClientProps {
  initialCredentials: CredentialItem[];
  credentialTypes: Array<{ id: string; code: string; name: string }>;
  programs: Array<{ id: string; name: string }>;
  verificationBaseUrl: string;
}

export function CredentialsClient({
  initialCredentials,
  credentialTypes,
  programs,
  verificationBaseUrl,
}: CredentialsClientProps) {
  const [credentials, setCredentials] = useState<CredentialItem[]>(initialCredentials);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [qrModalItem, setQrModalItem] = useState<{
    credential: CredentialItem;
    qrDataUrl: string;
    url: string;
  } | null>(null);
  const [revokeModalItem, setRevokeModalItem] = useState<CredentialItem | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);

  // New credential form
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientInstitution, setRecipientInstitution] = useState("");
  const [title, setTitle] = useState("");
  const [typeCode, setTypeCode] = useState(credentialTypes[0]?.code || "CERTIFICATE");
  const [role, setRole] = useState("");
  const [programName, setProgramName] = useState("");
  const [duration, setDuration] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Filtered credentials
  const filtered = credentials.filter((c) => {
    const matchesSearch =
      c.credentialId.toLowerCase().includes(search.toLowerCase()) ||
      c.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleDirectIssue(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const res = await fetch("/api/v1/credentials/direct-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          recipientEmail: recipientEmail || undefined,
          recipientPhone: recipientPhone || undefined,
          recipientInstitution: recipientInstitution || undefined,
          title,
          credentialTypeCode: typeCode,
          role: role || undefined,
          programName: programName || undefined,
          duration: duration || undefined,
          issueDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json?.error?.message || "Failed to issue credential.");
        setFormLoading(false);
        return;
      }

      const newCred = json.data.credential;
      const newItem: CredentialItem = {
        id: newCred.id,
        credentialId: newCred.credentialId,
        title: newCred.title,
        recipientName: newCred.recipientName,
        recipientEmail: recipientEmail || null,
        credentialType: typeCode.replace(/_/g, " "),
        program: programName || null,
        role: newCred.role || null,
        status: newCred.status,
        issueDate: newCred.issueDate ? new Date(newCred.issueDate).toLocaleDateString() : null,
        createdAt: new Date().toLocaleDateString(),
        revocationReason: null,
      };

      setCredentials([newItem, ...credentials]);
      setIsIssueModalOpen(false);

      // Reset form
      setRecipientName("");
      setRecipientEmail("");
      setRecipientPhone("");
      setRecipientInstitution("");
      setTitle("");
      setRole("");
      setProgramName("");
      setDuration("");

      // Open QR modal immediately so the user can test the newly issued credential!
      await openQrModal(newItem);
    } catch {
      setFormError("An unexpected network error occurred.");
    } finally {
      setFormLoading(false);
    }
  }

  async function openQrModal(item: CredentialItem) {
    const verificationUrl = `${verificationBaseUrl}/${item.credentialId}`;
    try {
      const qrDataUrl = await QRCodeLib.toDataURL(verificationUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrModalItem({ credential: item, qrDataUrl, url: verificationUrl });
    } catch (err) {
      console.error("Failed to generate QR Code:", err);
    }
  }

  async function handleRevoke(e: React.FormEvent) {
    e.preventDefault();
    if (!revokeModalItem || !revokeReason.trim()) return;

    setRevokeLoading(true);
    try {
      const res = await fetch(`/api/v1/credentials/${revokeModalItem.id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason.trim() }),
      });

      if (res.ok) {
        setCredentials(
          credentials.map((c) =>
            c.id === revokeModalItem.id
              ? { ...c, status: "REVOKED", revocationReason: revokeReason.trim() }
              : c
          )
        );
        setRevokeModalItem(null);
        setRevokeReason("");
      }
    } catch (err) {
      console.error("Revoke error:", err);
    } finally {
      setRevokeLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credentials</h1>
          <p className="text-sm text-gray-500 mt-1">
            Issue, manage, and track digital credentials with instant QR code verification.
          </p>
        </div>
        <button
          onClick={() => setIsIssueModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Issue Certificate
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, recipient or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "VALID", "DRAFT", "REVOKED", "EXPIRED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Credentials Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Credential ID</th>
                <th className="px-5 py-3">Recipient</th>
                <th className="px-5 py-3">Award / Title</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Issue Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-4 font-mono font-semibold text-xs text-blue-700">
                    {c.credentialId}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900">{c.recipientName}</p>
                    {c.recipientEmail && (
                      <p className="text-xs text-gray-400">{c.recipientEmail}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-800 font-medium">
                    {c.title}
                    {c.program && (
                      <span className="block text-xs text-gray-400 font-normal">
                        Program: {c.program}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-gray-700">
                    {c.credentialType}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        c.status === "VALID"
                          ? "bg-green-100 text-green-800"
                          : c.status === "REVOKED"
                          ? "bg-red-100 text-red-800"
                          : c.status === "EXPIRED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    {c.issueDate ?? c.createdAt}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => openQrModal(c)}
                        title="View QR Code & Test Verification"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <a
                        href={`/verify/${c.credentialId}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Public Verification Page"
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {c.status !== "REVOKED" && (
                        <button
                          onClick={() => setRevokeModalItem(c)}
                          title="Revoke Credential"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <Award className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No credentials found. Click &quot;Issue Certificate&quot; to issue your first credential!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code & Verification Modal */}
      {qrModalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Certificate Verification QR</h3>
                <p className="text-xs text-gray-500 font-mono">{qrModalItem.credential.credentialId}</p>
              </div>
              <button
                onClick={() => setQrModalItem(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Image */}
            <div className="bg-gray-50 p-6 rounded-xl flex flex-col items-center justify-center border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrModalItem.qrDataUrl}
                alt="QR Code"
                className="w-56 h-56 rounded-lg shadow-sm border bg-white p-2"
              />
              <p className="text-xs text-gray-500 mt-3 text-center">
                Scan with any smartphone camera to instantly verify certificate authenticity.
              </p>
            </div>

            {/* Verification Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Official Verification URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={qrModalItem.url}
                  className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-xs font-mono text-gray-700 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(qrModalItem.url)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <a
                href={qrModalItem.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                <ExternalLink className="w-4 h-4" />
                Open Verification Page
              </a>
              <a
                href={qrModalItem.qrDataUrl}
                download={`${qrModalItem.credential.credentialId}-qr.png`}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download QR
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Direct Issue Certificate Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Issue New Certificate</h3>
                <p className="text-xs text-gray-500">Create and instantly publish a verifiable digital credential</p>
              </div>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleDirectIssue} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Recipient Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    placeholder="rahul@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Award Title / Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web Development Bootcamp"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Credential Type
                  </label>
                  <select
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {credentialTypes.map((t) => (
                      <option key={t.id} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Role / Position (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Intern"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Program / Batch Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tech Empowerment 2026"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Duration (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 Months / 120 Hours"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Institution / College (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Delhi University"
                    value={recipientInstitution}
                    onChange={(e) => setRecipientInstitution(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {formLoading ? "Issuing..." : "Issue & Generate QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revocation Modal */}
      {revokeModalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Revoke Credential
              </h3>
              <button onClick={() => setRevokeModalItem(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              You are revoking credential{" "}
              <strong className="font-mono text-gray-900">{revokeModalItem.credentialId}</strong> issued to{" "}
              <strong>{revokeModalItem.recipientName}</strong>. Once revoked, anyone scanning its QR code will see a
              public &quot;Revoked&quot; warning.
            </p>

            <form onSubmit={handleRevoke} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Revocation <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Administrative issuance error, disciplinary action, etc."
                  className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokeModalItem(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revokeLoading}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {revokeLoading ? "Revoking..." : "Confirm Revocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
