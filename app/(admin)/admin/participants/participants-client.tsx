"use client";

import { useState } from "react";
import { Users, Plus, Search, Mail, Phone, School, X, AlertCircle, Copy, Check } from "lucide-react";

interface ParticipantItem {
  id: string;
  participantCode: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  institution: string | null;
  graduationYear: number | null;
  city: string | null;
  credentialsCount: number;
  createdAt: string;
}

export function ParticipantsClient({
  initialParticipants,
}: {
  initialParticipants: ParticipantItem[];
}) {
  const [participants, setParticipants] = useState<ParticipantItem[]>(initialParticipants);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = participants.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      fullName.includes(q) ||
      (p.participantCode && p.participantCode.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.institution && p.institution.toLowerCase().includes(q))
    );
  });

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email ? email.trim().toLowerCase() : undefined,
          phone: phone ? phone.trim() : undefined,
          institution: institution ? institution.trim() : undefined,
          graduationYear: graduationYear ? parseInt(graduationYear) : undefined,
          city: city ? city.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to create participant");
        setLoading(false);
        return;
      }

      const created = json.data;
      setParticipants([
        {
          id: created.id,
          participantCode: created.participantCode || null,
          firstName: created.firstName,
          lastName: created.lastName,
          email: created.email,
          phone: created.phone,
          institution: created.institution,
          graduationYear: created.graduationYear,
          city: created.city,
          credentialsCount: 0,
          createdAt: new Date().toLocaleDateString(),
        },
        ...participants,
      ]);

      setIsModalOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setInstitution("");
      setGraduationYear("");
      setCity("");
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
          <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registered students and members eligible for credentials across programs.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Participant
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email or college…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Participant Name</th>
                <th className="px-5 py-3">Participant ID</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Institution / College</th>
                <th className="px-5 py-3">Graduation Year</th>
                <th className="px-5 py-3">Credentials</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-4 font-semibold text-gray-900">
                    {p.firstName} {p.lastName}
                    {p.city && <span className="block text-xs text-gray-400 font-normal">{p.city}</span>}
                  </td>
                  <td className="px-5 py-4">
                    {p.participantCode ? (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(p.participantCode!);
                          setCopiedId(p.participantCode!);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        title="Click to copy Participant ID"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 font-mono text-xs font-bold transition group cursor-pointer"
                      >
                        <span>{p.participantCode}</span>
                        {copiedId === p.participantCode ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-blue-400 group-hover:text-blue-700" />
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs font-mono">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {p.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {p.email}
                      </div>
                    )}
                    {p.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {p.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-gray-700">
                    {p.institution ? (
                      <div className="flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {p.institution}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600">{p.graduationYear ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                      {p.credentialsCount} Issued
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">{p.createdAt}</td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No participants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Participant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Add Participant</h3>
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

            <form onSubmit={handleAddParticipant} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New Delhi"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Institution</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="College / University"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    min="1990"
                    max="2050"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    placeholder="2026"
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
                  {loading ? "Adding…" : "Add Participant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
