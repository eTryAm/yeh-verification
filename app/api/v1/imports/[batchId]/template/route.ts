import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform") || "generic";

  let headers: string;
  let example: string;
  let notes: string;

  if (platform === "unstop") {
    headers = "Name,Email,Phone Number,College/University,Course/Branch";
    example = "Rahul Sharma,rahul@example.com,9876543210,IIT Delhi,Computer Science";
    notes = "Export from Unstop: Dashboard > My Events > Participants > Export CSV";
  } else if (platform === "internshala") {
    headers = "Name,Email ID,Contact,College,Stream";
    example = "Priya Patel,priya@example.com,9123456789,NIT Trichy,Electronics";
    notes = "Export from Internshala: Manage Internship > Applicants > Download CSV";
  } else if (platform === "google-forms") {
    headers = "First Name,Last Name,Email Address,Phone,College/University,Course";
    example = "Amit,Kumar,amit@example.com,9000000000,Delhi University,B.Com";
    notes = "Google Forms: Responses > Sheets icon > Download as CSV";
  } else {
    headers = "first_name,last_name,email,phone,institution,course";
    example = "John,Doe,john@example.com,9000000000,Example College,B.Tech";
    notes = "Generic template - all columns except first_name are optional";
  }

  const csv = [
    "# " + notes,
    "# Upload this file in the Imports section",
    "# Required: first_name (or name/Name). Recommended: email (for duplicate detection)",
    "",
    headers,
    example,
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yeh-import-template-${platform}.csv"`,
    },
  });
}