/**
 * Centralized feature flag key constants.
 */
export const FeatureFlags = {
  CREDENTIAL_ISSUANCE: "credential_issuance",
  PUBLIC_VERIFICATION: "public_verification",
  QR_VERIFICATION: "qr_verification",
  BULK_ISSUANCE: "bulk_issuance",
  CSV_IMPORT: "csv_import",
  EXCEL_IMPORT: "excel_import",
  GOOGLE_SHEETS: "google_sheets",
  EXTERNAL_INTEGRATIONS: "external_integrations",
  EMAIL_NOTIFICATIONS: "email_notifications",
  PUBLIC_CREDENTIAL_PAGES: "public_credential_pages",
  PARTNER_API: "partner_api",
  ANALYTICS: "analytics",
} as const;

export type FeatureFlagKey = (typeof FeatureFlags)[keyof typeof FeatureFlags];

/** V1 default values — used during organization seeding */
export const DefaultFeatureFlags: Record<
  FeatureFlagKey,
  { enabled: boolean; description: string }
> = {
  [FeatureFlags.CREDENTIAL_ISSUANCE]: {
    enabled: true,
    description: "Allow issuing new credentials",
  },
  [FeatureFlags.PUBLIC_VERIFICATION]: {
    enabled: true,
    description: "Public credential verification endpoint",
  },
  [FeatureFlags.QR_VERIFICATION]: {
    enabled: true,
    description: "QR codes on credential issuance",
  },
  [FeatureFlags.BULK_ISSUANCE]: {
    enabled: true,
    description: "Bulk credential issuance",
  },
  [FeatureFlags.CSV_IMPORT]: { enabled: true, description: "CSV file imports" },
  [FeatureFlags.EXCEL_IMPORT]: {
    enabled: false,
    description: "Excel file imports (V1.1)",
  },
  [FeatureFlags.GOOGLE_SHEETS]: {
    enabled: false,
    description: "Google Sheets synchronization (V1.1)",
  },
  [FeatureFlags.EXTERNAL_INTEGRATIONS]: {
    enabled: false,
    description: "External REST API adapters",
  },
  [FeatureFlags.EMAIL_NOTIFICATIONS]: {
    enabled: false,
    description: "Email delivery (V1.1)",
  },
  [FeatureFlags.PUBLIC_CREDENTIAL_PAGES]: {
    enabled: false,
    description: "Per-credential public shareable pages",
  },
  [FeatureFlags.PARTNER_API]: {
    enabled: false,
    description: "External partner API access (V2)",
  },
  [FeatureFlags.ANALYTICS]: { enabled: true, description: "Analytics dashboard" },
};
