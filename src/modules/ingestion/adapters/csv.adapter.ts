import Papa from "papaparse";
import type { DataSourceAdapter, RawRecord, NormalizedRecord, ValidationResult } from "./base.adapter";
import type { DataSource } from "@prisma/client";

/**
 * Robust CSV ingestion adapter.
 * Performs intelligent, case-insensitive, punctuation-stripped alias matching
 * for all external platforms (Unstop, Internshala, Google Forms, Typeform, Excel exports).
 */
export interface CsvAdapterConfig {
  fileBuffer: Buffer;
  fieldMap?: Partial<{
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string;
    institution: string;
    course: string;
    programCode: string;
    date: string;
  }>;
}

/**
 * Intelligent field value extractor using fuzzy/alias matching.
 */
function extractValue(row: Record<string, unknown>, aliases: string[]): string {
  // 1. Direct exact key check
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== "") {
      return String(row[alias]).trim();
    }
  }

  // 2. Canonical index: lowercase, alphanumeric only
  const normalizedMap = new Map<string, string>();
  for (const [key, val] of Object.entries(row)) {
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      const canonicalKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!normalizedMap.has(canonicalKey)) {
        normalizedMap.set(canonicalKey, String(val).trim());
      }
    }
  }

  for (const alias of aliases) {
    const canonicalAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedMap.has(canonicalAlias)) {
      return normalizedMap.get(canonicalAlias)!;
    }
  }

  return "";
}

export class CsvAdapter implements DataSourceAdapter {
  readonly source: DataSource = "CSV";

  async fetch(config: Record<string, unknown>): Promise<RawRecord[]> {
    const { fileBuffer } = config as unknown as CsvAdapterConfig;

    const csv = fileBuffer.toString("utf-8");
    const result = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      transform: (val) => val.trim(),
    });

    if (result.errors.length > 0) {
      const fatal = result.errors.filter((e) => e.type === "Delimiter" || e.type === "Quotes");
      if (fatal.length > 0) {
        throw new Error(`CSV parse error: ${fatal[0].message}`);
      }
    }

    return result.data
      .filter((row) => Object.values(row).some((val) => val && String(val).trim().length > 0))
      .map((row, index) => ({
        externalId: this.extractExternalId(row, index),
        rawPayload: row as Record<string, unknown>,
      }));
  }

  normalize(raw: RawRecord): NormalizedRecord {
    const row = (raw.rawPayload || {}) as Record<string, unknown>;

    // 1. First & Last name resolution
    let firstName = extractValue(row, [
      "first_name",
      "firstname",
      "first name",
      "fname",
      "given_name",
      "given name",
    ]);
    let lastName = extractValue(row, [
      "last_name",
      "lastname",
      "last name",
      "lname",
      "surname",
      "family_name",
      "family name",
    ]);

    // If separate names not found, look for combined full name
    if (!firstName && !lastName) {
      const fullName = extractValue(row, [
        "full_name",
        "fullname",
        "full name",
        "name",
        "participant_name",
        "participant name",
        "student_name",
        "student name",
        "candidate_name",
        "candidate name",
        "recipient_name",
        "recipient name",
        "applicant_name",
        "applicant name",
        "user_name",
      ]);

      if (fullName) {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) {
          firstName = parts[0];
          lastName = "";
        } else {
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        }
      }
    }

    // 2. Email
    const rawEmail = extractValue(row, [
      "email",
      "email_id",
      "email id",
      "email_address",
      "email address",
      "e_mail",
      "e-mail",
      "mail",
      "contact_email",
    ]);
    const email = this.sanitizeEmail(rawEmail);

    // 3. Phone
    const rawPhone = extractValue(row, [
      "phone",
      "phone_number",
      "phone number",
      "phone_no",
      "phone no",
      "mobile",
      "mobile_number",
      "mobile number",
      "mobile_no",
      "mobile no",
      "contact",
      "contact_number",
      "contact_no",
      "whatsapp",
    ]);
    const phone = rawPhone.replace(/\D/g, "");

    // 4. Institution / College
    const institution = extractValue(row, [
      "college",
      "institution",
      "university",
      "school",
      "institute",
      "college_name",
      "college name",
      "institution_name",
      "institution name",
      "university_name",
      "university name",
      "college/university",
      "campus",
      "organization",
      "company",
    ]);

    // 5. Course / Degree
    const degree = extractValue(row, ["degree", "qualification"]);
    const branch = extractValue(row, [
      "course",
      "branch",
      "stream",
      "specialization",
      "department",
      "field_of_study",
    ]);
    const course =
      degree && branch
        ? `${degree} - ${branch}`
        : branch || degree || undefined;

    // 6. Program / Opportunity
    const programCode = extractValue(row, [
      "opportunity_name",
      "opportunity",
      "program",
      "program_name",
      "event",
      "event_name",
      "competition",
      "track",
    ]);

    // 7. Extra metadata
    const graduationYear = extractValue(row, [
      "graduation_year",
      "graduation year",
      "grad_year",
      "passout_year",
      "batch",
    ]);
    const registrationId = extractValue(row, [
      "registration_id",
      "registration id",
      "application_id",
      "application id",
      "unstop_id",
      "candidate_id",
      "roll_no",
      "id",
    ]);

    return {
      externalId: registrationId || raw.externalId,
      firstName: firstName || "",
      lastName: lastName || "",
      email: email || undefined,
      phone: phone || undefined,
      institution: institution || undefined,
      course: course || undefined,
      programCode: programCode || undefined,
      metadata: {
        _source_row: row,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) || graduationYear : undefined,
        registrationId: registrationId || undefined,
        programName: programCode || undefined,
      },
    };
  }

  validate(normalized: NormalizedRecord): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    if (!normalized.firstName?.trim()) {
      errors.push({
        field: "name",
        message: "Participant name is required (columns: full_name, name, or first_name)",
      });
    }

    if (normalized.email && !this.isValidEmail(normalized.email)) {
      errors.push({
        field: "email",
        message: `Invalid email format: "${normalized.email}"`,
      });
    }

    if (!normalized.email && !normalized.phone) {
      errors.push({
        field: "contact",
        message: "Either email or phone is required for identification",
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  private extractExternalId(row: Record<string, unknown>, index: number): string {
    const regId = extractValue(row, [
      "registration_id",
      "registration id",
      "application_id",
      "application id",
      "unstop_id",
      "candidate_id",
      "roll_no",
      "id",
    ]);
    if (regId) return regId;

    const email = extractValue(row, ["email", "email_id", "email_address"]);
    if (email) return `csv:email:${email.toLowerCase().trim()}`;

    return `csv:row:${index + 1}`;
  }

  private sanitizeEmail(raw: string): string {
    return raw.toLowerCase().trim();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const csvAdapter = new CsvAdapter();