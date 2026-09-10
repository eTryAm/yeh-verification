import Papa from "papaparse";
import type { DataSourceAdapter, RawRecord, NormalizedRecord, ValidationResult } from "./base.adapter";
import type { DataSource } from "@prisma/client";

/**
 * CSV ingestion adapter.
 * Expects a CSV file buffer with configurable column mappings.
 *
 * Required columns (configurable via fieldMap):
 *   - firstName or name (will be split on space if no lastName column)
 *   - email (strongly recommended — used for duplicate detection)
 *
 * Optional columns: phone, institution, course, programCode, date
 */
export interface CsvAdapterConfig {
  fileBuffer: Buffer;
  /** Map of CSV column header → normalized field name */
  fieldMap?: Partial<{
    firstName: string;
    lastName: string;
    name: string; // full name — split into first/last
    email: string;
    phone: string;
    institution: string;
    course: string;
    programCode: string;
    date: string;
  }>;
}

export class CsvAdapter implements DataSourceAdapter {
  readonly source: DataSource = "CSV";

  async fetch(config: Record<string, unknown>): Promise<RawRecord[]> {
    const { fileBuffer, fieldMap = {} } = config as unknown as CsvAdapterConfig;

    const csv = fileBuffer.toString("utf-8");
    const result = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (val) => val.trim(),
    });

    if (result.errors.length > 0) {
      const fatal = result.errors.filter((e) => e.type === "Delimiter" || e.type === "Quotes");
      if (fatal.length > 0) {
        throw new Error(`CSV parse error: ${fatal[0].message}`);
      }
    }

    return result.data.map((row, index) => ({
      externalId: this.extractExternalId(row, index),
      rawPayload: row as Record<string, unknown>,
    }));
  }

  normalize(raw: RawRecord): NormalizedRecord {
    const row = raw.rawPayload as Record<string, string>;

    // Name parsing — support both separate firstName/lastName or combined name
    let firstName = (row["firstName"] ?? row["first_name"] ?? row["First Name"] ?? "").trim();
    let lastName = (row["lastName"] ?? row["last_name"] ?? row["Last Name"] ?? "").trim();

    if (!firstName && !lastName) {
      const fullName = (row["name"] ?? row["Name"] ?? row["Full Name"] ?? "").trim();
      const parts = fullName.split(/\s+/);
      firstName = parts[0] ?? "";
      lastName = parts.slice(1).join(" ") || "";
    }

    return {
      externalId: raw.externalId,
      firstName,
      lastName,
      email: this.sanitizeEmail(row["email"] ?? row["Email"] ?? row["Email Address"] ?? ""),
      phone: (row["phone"] ?? row["Phone"] ?? row["Mobile"] ?? row["Contact"] ?? "").replace(/\D/g, "") || undefined,
      institution: row["institution"] ?? row["Institution"] ?? row["College"] ?? row["University"] ?? undefined,
      course: row["course"] ?? row["Course"] ?? row["Branch"] ?? row["Stream"] ?? undefined,
      programCode: row["programCode"] ?? row["program_code"] ?? row["Program"] ?? undefined,
      metadata: { _source_row: row },
    };
  }

  validate(normalized: NormalizedRecord): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    if (!normalized.firstName?.trim()) {
      errors.push({ field: "firstName", message: "First name is required" });
    }
    if (!normalized.lastName?.trim()) {
      // Warn but don't hard-fail — some sources only have one name field
      // errors.push({ field: "lastName", message: "Last name is required" });
    }
    if (normalized.email && !this.isValidEmail(normalized.email)) {
      errors.push({ field: "email", message: "Invalid email format" });
    }
    if (!normalized.email && !normalized.phone) {
      errors.push({
        field: "email",
        message: "At least one of email or phone is required for duplicate detection",
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  private extractExternalId(row: Record<string, string>, index: number): string {
    // Use email as external ID if present (most stable identifier)
    const email = this.sanitizeEmail(
      row["email"] ?? row["Email"] ?? row["Email Address"] ?? ""
    );
    if (email) return `csv:email:${email}`;

    // Fall back to row index (less stable but workable)
    return `csv:row:${index}`;
  }

  private sanitizeEmail(raw: string): string {
    return raw.toLowerCase().trim();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const csvAdapter = new CsvAdapter();
