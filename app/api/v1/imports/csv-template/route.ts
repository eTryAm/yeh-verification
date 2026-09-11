import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform") || "generic";

  type PlatformKey = "unstop" | "internshala" | "google-forms" | "generic";
  const templates: Record<PlatformKey, { headers: string; example: string; notes: string }> = {
    unstop: {
      headers: "Name,Email,Phone Number,College/University,Course/Branch",
      example: "Rahul Sharma,rahul@example.com,9876543210,IIT Delhi,Computer Science",
      notes: "Unstop export: Dashboard > My Events > Participants > Export CSV",
    },
    internshala: {
      headers: "Name,Email ID,Contact,College,Stream",
      example: "Priya Patel,priya@example.com,9123456789,NIT Trichy,Electronics",
      notes: "Internshala export: Manage Internship > Applicants > Download CSV",
    },
    "google-forms": {
      headers: "First Name,Last Name,Email Address,Phone,College/University,Course",
      example: "Amit,Kumar,amit@example.com,9000000000,Delhi University,B.Com",
      notes: "Google Forms: Responses > Sheets icon > File > Download > CSV",
    },
    generic: {
      headers: "first_name,last_name,email,phone,institution,course",
      example: "John,Doe,john@example.com,9000000000,Example College,B.Tech",
      notes: "Generic template - first_name required, email strongly recommended",
    },
  };

  const tpl = templates[(platform as PlatformKey)] || templates.generic;
  const csv = [
    "# " + tpl.notes,
    "# Upload this file in the YEH Credentials Admin > Imports section",
    "# Required: Name (or first_name). Strongly recommended: email",
    "",
    tpl.headers,
    tpl.example,
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"yeh-import-template-" + platform + ".csv\"",
    },
  });
}