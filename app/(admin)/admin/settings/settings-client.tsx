"use client";

import { useState } from "react";
import { Shield, Key, Building, Flag, CheckCircle2, AlertCircle } from "lucide-react";

interface SettingsClientProps {
  user: {
    name: string;
    email: string;
    role: string;
    createdAt: string;
    lastLoginAt: string;
  };
  organization: {
    name: string;
    slug: string;
  };
  flags: Array<{
    key: string;
    isEnabled: boolean;
    description: string | null;
  }>;
}

export function SettingsClient({ user, organization, flags }: SettingsClientProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (newPassword && newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    if (!currentPassword) {
      setErrorMessage("Current password is required to make changes.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/change-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword: newPassword || undefined,
          newEmail: email !== user.email ? email : undefined,
          newName: name !== user.name ? name : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error?.message || "Failed to update credentials.");
      } else {
        setSuccessMessage(data?.data?.message || "Credentials updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setErrorMessage("An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Account Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Account Overview</h2>
            <p className="text-xs text-gray-500">Your profile details and permissions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 font-medium">Full Name</p>
            <p className="text-gray-900 font-semibold mt-0.5">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Email Address</p>
            <p className="text-gray-900 font-semibold mt-0.5">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Assigned Role</p>
            <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-200">
              {user.role}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Organization</p>
            <p className="text-gray-900 font-semibold mt-0.5">{organization.name} ({organization.slug})</p>
          </div>
        </div>
      </div>

      {/* Change Credentials Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Change Sign-in Credentials</h2>
            <p className="text-xs text-gray-500">Update your email or sign-in password at any time</p>
          </div>
        </div>

        {successMessage && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sign-in Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Current Password <span className="text-red-500">* (Required to save changes)</span>
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Password <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving changes…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Feature Flags Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Feature Flags Status</h2>
            <p className="text-xs text-gray-500">Current platform features enabled for your organization</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {flags.map((flag) => (
            <div
              key={flag.key}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50"
            >
              <div>
                <p className="text-xs font-mono font-medium text-gray-800">{flag.key}</p>
                <p className="text-xs text-gray-500">{flag.description}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  flag.isEnabled
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {flag.isEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
