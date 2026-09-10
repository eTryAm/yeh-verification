"use client";

import { useState } from "react";
import { BookOpen, Plus, Search, Calendar, Award, X, AlertCircle } from "lucide-react";

interface ProgramItem {
  id: string;
  name: string;
  programCode: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  credentialsCount: number;
  registrationsCount: number;
  createdAt: string;
}

export function ProgramsClient({ initialPrograms }: { initialPrograms: ProgramItem[] }) {
  const [programs, setPrograms] = useState<ProgramItem[]>(initialPrograms);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [programCode, setProgramCode] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = programs.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.programCode.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          programCode: programCode.trim().toUpperCase(),
          description: description ? description.trim() : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to create program");
        setLoading(false);
        return;
      }

      const created = json.data;
      setPrograms([
        {
          id: created.id,
          name: created.name,
          programCode: created.programCode,
          description: created.description,
          startDate: created.startDate ? new Date(created.startDate).toLocaleDateString() : null,
          endDate: created.endDate ? new Date(created.endDate).toLocaleDateString() : null,
          isActive: true,
          credentialsCount: 0,
          registrationsCount: 0,
          createdAt: new Date().toLocaleDateString(),
        },
        ...programs,
      ]);

      setIsModalOpen(false);
      setName("");
      setProgramCode("");
      setDescription("");
      setStartDate("");
      setEndDate("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Training bootcamps, workshops, internships, and certification tracks.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Program
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search programs by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {p.programCode}
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Active" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mt-2">{p.name}</h3>
              {p.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3 mt-4 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  {p.startDate ? p.startDate : "Open enrollment"}
                  {p.endDate ? ` — ${p.endDate}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-gray-700 pt-1">
                <div className="flex items-center gap-1 text-blue-600">
                  <Award className="w-3.5 h-3.5" />
                  <span>{p.credentialsCount} Issued</span>
                </div>
                <span>Created {p.createdAt}</span>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No programs created yet. Click &quot;Create Program&quot; to get started.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Create New Program</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProgram} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Program Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full Stack Web Development Internship"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!programCode) {
                      setProgramCode(
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "-")
                          .slice(0, 15)
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Program Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FSD-2026"
                  value={programCode}
                  onChange={(e) => setProgramCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of syllabus or duration"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {loading ? "Creating…" : "Create Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
