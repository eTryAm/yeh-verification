import { UserRole } from "@prisma/client";

/**
 * All granular permissions in the system.
 * Enforced server-side in every service method.
 */
export const Permission = {
  // Credentials
  CREDENTIAL_CREATE: "credential.create",
  CREDENTIAL_VIEW: "credential.view",
  CREDENTIAL_ISSUE: "credential.issue",
  CREDENTIAL_REVOKE: "credential.revoke",
  CREDENTIAL_EXPORT: "credential.export",

  // Participants
  PARTICIPANT_VIEW: "participant.view",
  PARTICIPANT_UPDATE: "participant.update",

  // Imports
  IMPORT_CREATE: "import.create",
  IMPORT_APPROVE: "import.approve",
  IMPORT_REJECT: "import.reject",

  // Templates
  TEMPLATE_CREATE: "template.create",
  TEMPLATE_UPDATE: "template.update",
  TEMPLATE_PUBLISH: "template.publish",

  // Verification
  VERIFICATION_VIEW: "verification.view",

  // Audit
  AUDIT_VIEW: "audit.view",

  // System
  SETTINGS_MANAGE: "settings.manage",
  USER_MANAGE: "user.manage",
  ORG_MANAGE: "org.manage",
  ANALYTICS_VIEW: "analytics.view",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];
