import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Verify a Credential",
};

async function handleVerify(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim().toUpperCase();
  if (id) {
    redirect(`/verify/${id}`);
  }
}

export default function VerifyIndexPage() {
  return (
    <div className="text-center space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verify a Credential</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Enter the Credential ID from the certificate to check its authenticity.
        </p>
      </div>

      <form action={handleVerify} className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
        <input
          name="id"
          type="text"
          placeholder="e.g. YEH-CERT-2026-000001"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Verify
        </button>
      </form>

      <p className="text-xs text-gray-400">
        Credential IDs are printed on every certificate issued by Youth Empowerment Hub.
      </p>
    </div>
  );
}
