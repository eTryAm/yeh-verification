import type { DataSource } from "@prisma/client";

export interface RawRecord {
  externalId: string;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedRecord {
  externalId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  institution?: string;
  course?: string;
  programCode?: string;
  sourceDate?: Date;
  metadata: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
}

/**
 * DataSourceAdapter — implement this interface for each external data source.
 * V1 implementations: CsvAdapter
 * V1.1: ExcelAdapter, GoogleSheetsAdapter
 * V2: UnstopAdapter, InternshalaAdapter (via official APIs only)
 */
export interface DataSourceAdapter {
  readonly source: DataSource;
  fetch(config: Record<string, unknown>): Promise<RawRecord[]>;
  normalize(raw: RawRecord): NormalizedRecord;
  validate(normalized: NormalizedRecord): ValidationResult;
}
