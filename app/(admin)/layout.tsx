import { redirect } from "next/navigation";
import { auth } from "@/modules/auth/auth.config";
import { AdminSidebar } from "@/app/(admin)/_components/admin-sidebar";
import { AdminHeader } from "@/app/(admin)/_components/admin-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | YEH Admin",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader user={session.user as { name?: string; email?: string }} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
