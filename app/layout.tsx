import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "YEH Credential Platform",
    template: "%s | YEH Credentials",
  },
  description: "Youth Empowerment Hub — Digital Credential & Verification Platform",
  robots: { index: false, follow: false }, // Admin platform — not for public indexing
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
