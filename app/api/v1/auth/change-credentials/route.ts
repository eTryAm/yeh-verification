import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/db/prisma";
import { requireSession } from "@/modules/rbac/enforce";
import { auditService } from "@/modules/audit/audit.service";
import { ok, errorResponse, handleRouteError } from "@/lib/api-response";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const changeCredentialsSchema = z.object({
  currentPassword: z.string().min(8, "Current password must be at least 8 characters"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
  newEmail: z.string().email("Invalid email format").optional(),
  newName: z.string().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSession();
    const body = await request.json();
    const input = changeCredentialsSchema.parse(body);

    // Fetch existing password hash
    const userPassword = await prisma.userPassword.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!userPassword) {
      return errorResponse("NOT_FOUND", "User password record not found", 404);
    }

    // Verify current password
    const currentHash = createHash("sha256").update(input.currentPassword).digest("hex");
    if (currentHash !== userPassword.passwordHash) {
      return errorResponse("UNAUTHORIZED", "Current password is incorrect", 401);
    }

    // Update password if requested
    if (input.newPassword) {
      const newHash = createHash("sha256").update(input.newPassword).digest("hex");
      await prisma.userPassword.update({
        where: { userId: sessionUser.id },
        data: { passwordHash: newHash },
      });
    }

    // Update email and/or name if requested
    const userUpdates: { email?: string; name?: string } = {};
    if (input.newEmail && input.newEmail.toLowerCase() !== sessionUser.email.toLowerCase()) {
      // Check if email already in use
      const existingUser = await prisma.user.findFirst({
        where: {
          email: input.newEmail.toLowerCase().trim(),
          id: { not: sessionUser.id },
        },
      });
      if (existingUser) {
        return errorResponse("CONFLICT", "Email address is already in use", 409);
      }
      userUpdates.email = input.newEmail.toLowerCase().trim();
    }

    if (input.newName) {
      userUpdates.name = input.newName.trim();
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: userUpdates,
      });
    }

    // Audit log
    await auditService.log({
      organizationId: sessionUser.organizationId,
      actorId: sessionUser.id,
      action: "SETTINGS_CHANGED",
      resourceType: "UserCredentials",
      resourceId: sessionUser.id,
      result: "SUCCESS",
      metadata: {
        passwordChanged: !!input.newPassword,
        emailChanged: !!userUpdates.email,
        nameChanged: !!userUpdates.name,
      },
    });

    return ok({
      message: "Credentials updated successfully. Please use your new credentials next time you sign in.",
      email: userUpdates.email ?? sessionUser.email,
      name: userUpdates.name ?? sessionUser.name,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
