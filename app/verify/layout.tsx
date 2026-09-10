import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Credential | Youth Empowerment Hub",
  description: "Verify the authenticity of a Youth Empowerment Hub digital credential.",
  robots: { index: true, follow: false },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">YEH</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Youth Empowerment Hub</p>
            <p className="text-xs text-gray-500">Credential Verification</p>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10">
        {children}
      </main>
      <footer className="text-center py-6 text-xs text-gray-400">
        © {new Date().getFullYear()} Youth Empowerment Hub · youthempowerment.in
      </footer>
    </div>
  );
}
