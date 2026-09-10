import { redirect } from "next/navigation";
import { auth } from "@/modules/auth/auth.config";

/**
 * Root page — redirect authenticated users to admin dashboard,
 * unauthenticated users to login.
 */
export default async function RootPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/admin");
  }
  redirect("/login");
}
