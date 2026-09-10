import { UserRole } from "@prisma/client";
import { Permission, type PermissionKey } from "./permissions";

/**
 * Role → Permission mapping.
 * This is the authoritative RBAC matrix.
 * Every role gets an explicit set — no implicit inheritance.
 */
export const RolePermissions: Record<UserRole, PermissionKey[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),

  [UserRole.ORG_ADMIN]: [
    Permission.CREDENTIAL_CREATE,
    Permission.CREDENTIAL_VIEW,
    Permission.CREDENTIAL_ISSUE,
    Permission.CREDENTIAL_REVOKE,
    Permission.CREDENTIAL_EXPORT,
    Permission.PARTICIPANT_VIEW,
    Permission.PARTICIPANT_UPDATE,
    Permission.IMPORT_CREATE,
    Permission.IMPORT_APPROVE,
    Permission.IMPORT_REJECT,
    Permission.TEMPLATE_CREATE,
    Permission.TEMPLATE_UPDATE,
    Permission.TEMPLATE_PUBLISH,
    Permission.VERIFICATION_VIEW,
    Permission.AUDIT_VIEW,
    Permission.SETTINGS_MANAGE,
    Permission.USER_MANAGE,
    Permission.ANALYTICS_VIEW,
  ],

  [UserRole.CREDENTIAL_ADMIN]: [
    Permission.CREDENTIAL_CREATE,
    Permission.CREDENTIAL_VIEW,
    Permission.CREDENTIAL_ISSUE,
    Permission.CREDENTIAL_REVOKE,
    Permission.CREDENTIAL_EXPORT,
    Permission.PARTICIPANT_VIEW,
    Permission.TEMPLATE_CREATE,
    Permission.TEMPLATE_UPDATE,
    Permission.TEMPLATE_PUBLISH,
    Permission.VERIFICATION_VIEW,
    Permission.ANALYTICS_VIEW,
  ],

  [UserRole.CREDENTIAL_ISSUER]: [
    Permission.CREDENTIAL_CREATE,
    Permission.CREDENTIAL_VIEW,
    Permission.CREDENTIAL_ISSUE,
    Permission.CREDENTIAL_EXPORT,
    Permission.PARTICIPANT_VIEW,
  ],

  [UserRole.IMPORT_ADMIN]: [
    Permission.PARTICIPANT_VIEW,
    Permission.PARTICIPANT_UPDATE,
    Permission.IMPORT_CREATE,
    Permission.IMPORT_APPROVE,
    Permission.IMPORT_REJECT,
  ],

  [UserRole.VERIFICATION_ADMIN]: [
    Permission.CREDENTIAL_VIEW,
    Permission.VERIFICATION_VIEW,
  ],

  [UserRole.AUDITOR]: [
    Permission.CREDENTIAL_VIEW,
    Permission.PARTICIPANT_VIEW,
    Permission.VERIFICATION_VIEW,
    Permission.AUDIT_VIEW,
    Permission.ANALYTICS_VIEW,
  ],

  [UserRole.ANALYST]: [
    Permission.CREDENTIAL_VIEW,
    Permission.CREDENTIAL_EXPORT,
    Permission.PARTICIPANT_VIEW,
    Permission.VERIFICATION_VIEW,
    Permission.ANALYTICS_VIEW,
  ],

  [UserRole.VIEW_ONLY]: [
    Permission.CREDENTIAL_VIEW,
    Permission.PARTICIPANT_VIEW,
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: UserRole): PermissionKey[] {
  return RolePermissions[role] ?? [];
}
