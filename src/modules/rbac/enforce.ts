import { auth } from "@/modules/auth/auth.config";
import { hasPermission } from "./roles";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { PermissionKey } from "./permissions";
import type { UserRole } from "@prisma/client";

export interface SessionUser {
  id: string;
  organizationId: string;
  role: UserRole;
  name: string;
  email: string;
}

/**
 * Get the current session user or throw UnauthorizedError.
 * Use in every protected route handler and service method.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  // The session user is typed by Auth.js — we cast to our SessionUser type
  return session.user as unknown as SessionUser;
}

/**
 * Get session user AND assert they have the required permission.
 * Throws ForbiddenError if the permission is not granted.
 */
export async function requirePermission(
  permission: PermissionKey
): Promise<SessionUser> {
  const user = await requireSession();
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError();
  }
  return user;
}

/**
 * Assert that the resource's organizationId matches the session user's org.
 * NEVER trust organizationId from the client request — always use this check.
 */
export function assertSameOrg(
  sessionUser: SessionUser,
  resourceOrgId: string
): void {
  if (sessionUser.organizationId !== resourceOrgId) {
    // Do not reveal the actual org ID in the error message
    throw new ForbiddenError();
  }
}

/**
 * Inject organizationId from session into a query — never from client input.
 */
export function orgFilter(user: SessionUser): { organizationId: string } {
  return { organizationId: user.organizationId };
}
