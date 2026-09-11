"use client";
import { useState, useRef } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, Download, Loader2, RefreshCw, Package
} from "lucide-react";

interface Batch {
  id: string;
  sourceFileName: string;
  source: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  conflictRows: number;
  importedRows: number;
  createdAt: string;
  metadata?: { credentialTitle?: string; programName?: string; credentialTypeCode?: string };
}

interface ImportResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  conflictRows: number;
}

const CREDENTIAL_TYPES = [
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "PARTICIPATION", label: "Participation" },
  { value: "ACHIEVEMENT", label: "Achievement" },
  { value: "LEADERSHIP", label: "Leadership" },
  { value: "APPRECIATION", label: "Appreciation" },
  { value: "BADGE", label: "Badge" },
];

const statusColor: Record<string, string> = {
  AWAITING_APPROVAL: "bg-amber-50 text-amber-700 border border-amber-200",
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  FAILED: "bg-red-50 text-red-700 border border-red-200",
  STAGING: "bg-blue-50 text-blue-700 border border-blue-200",
  PROCESSING: "bg-blue-50 text-blue-700 border border-blue-200",
  PENDING: "bg-gray-50 text-gray-600 border border-gray-200",
};

export default function ImportsClient({ initialBatches }: { initialBatches: Batch[] }) {
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [credentialTypeCode, setCredentialTypeCode] = useState("CERTIFICATE");
  const [credentialTitle, setCredentialTitle] = useState("Certificate of Participation");
  const [programName, setProgramName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  async function refreshBatches() {
    const res = await fetch("/api/v1/imports");
    const json = await res.json();
    if (json.success) setBatches(json.data);
  }

  async function handleUpload() {
    if (!selectedFile) { setError("Please select a CSV file first"); return; }
    setUploading(true); setError(""); setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("credentialTypeCode", credentialTypeCode);
      fd.append("credentialTitle", credentialTitle);
      fd.append("programName", programName);
      const res = await fetch("/api/v1/imports", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Upload failed");
      setUploadResult(json.data);
      await refreshBatches();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleApprove(batchId: string) {
    setApproving(batchId); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/v1/imports/" + batchId + "/approve", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Approval failed");
      setSuccess("Done! " + json.data.issued + " credentials issued, " + json.data.skipped + " skipped (already issued).");
      await refreshBatches();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setApproving(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) { setSelectedFile(f); setError(""); }
    else setError("Please drop a .csv file");
  }

  function resetUpload() {
    setShowUpload(false); setSelectedFile(null); setUploadResult(null); setError("");
    setCredentialTitle("Certificate of Participation"); setProgramName(""); setCredentialTypeCode("CERTIFICATE");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Imports</h1>
          <p className="text-sm text-gray-500 mt-1">Bulk-import participants from CSV and auto-issue credentials.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowUpload(true); setUploadResult(null); setError(""); setSuccess(""); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow transition"
          >
            <Upload className="w-4 h-4" /> Upload CSV
          </button>
          <button onClick={refreshBatches} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Success / Error banners */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <XCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Upload Panel */}
      {showUpload && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Upload CSV File</h2>
            <button onClick={resetUpload} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
          </div>

          {/* Template downloads */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Download Template for your platform</p>
            <div className="flex flex-wrap gap-2">
              {["unstop", "internshala", "google-forms", "generic"].map((p) => (
                <a
                  key={p}
                  href={"/api/v1/imports/csv-template?platform=" + p}
                  download
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-3 py-1.5 rounded-lg"
                >
                  <Download className="w-3 h-3" />
                  {p === "google-forms" ? "Google Forms" : p.charAt(0).toUpperCase() + p.slice(1)}
                </a>
              ))}
            </div>
            <p className="text-xs text-blue-600">Fill in the template with your participants, then upload it below.</p>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Credential Type *</label>
              <select
                value={credentialTypeCode}
                onChange={(e) => setCredentialTypeCode(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {CREDENTIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Certificate Title *</label>
              <input
                type="text"
                value={credentialTitle}
                onChange={(e) => setCredentialTitle(e.target.value)}
                placeholder="Certificate of Participation"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Program / Event Name</label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="e.g. Hackathon 2026"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Drop zone */}
          {!uploadResult && (
            <div
              className={"border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition " +
                (dragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-gray-50")}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-gray-800">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB — click to change</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-600">Drop your CSV here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Supports Unstop, Internshala, Google Forms, or generic CSV exports</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) { setSelectedFile(e.target.files[0]); setError(""); } }} />
            </div>
          )}

          {/* Upload result summary */}
          {uploadResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> File processed successfully
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {[
                  { label: "Total Rows", val: uploadResult.totalRows, color: "text-gray-900" },
                  { label: "Valid", val: uploadResult.validRows, color: "text-green-700" },
                  { label: "Invalid", val: uploadResult.invalidRows, color: "text-red-600" },
                  { label: "Conflicts", val: uploadResult.conflictRows, color: "text-amber-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-lg p-3 text-center border border-green-100">
                    <p className={"text-xl font-bold " + s.color}>{s.val}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-700 mt-2">
                Scroll down and click <strong>Approve & Issue Credentials</strong> on the new batch to generate all certificates.
              </p>
            </div>
          )}

          {!uploadResult && (
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing CSV...</> : <><Upload className="w-4 h-4" /> Upload & Analyse</>}
            </button>
          )}
        </div>
      )}

      {/* How to get CSV guide */}
      <details className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-5 cursor-pointer group">
        <summary className="flex items-center justify-between text-sm font-semibold text-indigo-900 list-none">
          <span className="flex items-center gap-2"><Package className="w-4 h-4" /> How to export participant CSV from external platforms</span>
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-700">
          {[
            {
              name: "Unstop",
              steps: ["Go to Dashboard > My Events", "Select your event/hackathon", "Click Participants tab", "Click Export / Download CSV", "Upload that CSV here"],
              cols: "Name, Email, Phone Number, College/University",
            },
            {
              name: "Internshala",
              steps: ["Go to Manage Internship/Job", "Click Applicants tab", "Click Download CSV at top-right", "Upload that CSV here"],
              cols: "Name, Email ID, Contact, College, Stream",
            },
            {
              name: "Google Forms",
              steps: ["Open your form > Responses tab", "Click the Google Sheets icon", "In Sheets: File > Download > CSV", "Upload that CSV here"],
              cols: "Depends on your form columns — use the Google Forms template above to match",
            },
          ].map((p) => (
            <div key={p.name} className="bg-white rounded-xl p-4 border border-indigo-100 space-y-2">
              <p className="font-bold text-indigo-800">{p.name}</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                {p.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <p className="text-gray-400 text-xs mt-1">Columns: <span className="text-gray-600">{p.cols}</span></p>
            </div>
          ))}
        </div>
      </details>

      {/* Batches list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">File / Source</th>
                <th className="px-5 py-3">Program / Title</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Valid</th>
                <th className="px-5 py-3">Issues</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Uploaded</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900 max-w-[160px] truncate" title={b.sourceFileName || b.source}>
                    {b.sourceFileName || b.source}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    <div>{(b.metadata as { credentialTitle?: string })?.credentialTitle || "—"}</div>
                    <div className="text-gray-400">{(b.metadata as { programName?: string })?.programName || ""}</div>
                  </td>
                  <td className="px-5 py-4">{b.totalRows}</td>
                  <td className="px-5 py-4 text-green-700 font-semibold">{b.validRows}</td>
                  <td className="px-5 py-4 text-amber-600 font-semibold">
                    {(b.invalidRows || 0) + (b.conflictRows || 0)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={"inline-block px-2.5 py-0.5 rounded-full text-xs font-bold " + (statusColor[b.status] || "bg-gray-50 text-gray-600")}>
                      {b.status === "AWAITING_APPROVAL" ? "Awaiting Approval" :
                       b.status === "COMPLETED" ? "Completed" : b.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    {b.status === "AWAITING_APPROVAL" && (
                      <button
                        onClick={() => handleApprove(b.id)}
                        disabled={approving === b.id}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                      >
                        {approving === b.id
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Issuing...</>
                          : <><CheckCircle2 className="w-3 h-3" /> Approve & Issue</>}
                      </button>
                    )}
                    {b.status === "COMPLETED" && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> {b.importedRows} issued
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No import batches yet. Click &quot;Upload CSV&quot; to get started.
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