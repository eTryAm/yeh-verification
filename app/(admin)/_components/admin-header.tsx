"use client";

import { signOut } from "next-auth/react";
import { LogOut, Bell } from "lucide-react";

interface AdminHeaderProps {
  user: { name?: string; email?: string };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        {/* Notification bell placeholder */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-700 text-xs font-semibold">
              {(user.name?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.name ?? "Admin"}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
