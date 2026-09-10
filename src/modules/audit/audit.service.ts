import { prisma } from "@/infrastructure/db/prisma";
import type { AuditAction } from "@prisma/client";
import {
  paginationToSkipTake,
  toPaginatedResult,
  type PaginationParams,
} from "@/lib/pagination";

export interface AuditLogInput {
  organizationId: string;
  actorId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  result: "SUCCESS" | "FAILURE";
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Append an audit log entry.
   * Errors are caught and logged — audit failures never block primary operations.
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: input.organizationId,
          actorId: input.actorId,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          result: input.result,
          metadata: (input.metadata ?? {}) as never,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (err) {
      console.error("[AuditService] Failed to write audit log", err);
    }
  }

  async list(
    organizationId: string,
    params: PaginationParams,
    filters?: { actorId?: string; resourceType?: string; resourceId?: string }
  ) {
    const where = {
      organizationId,
      ...(filters?.actorId ? { actorId: filters.actorId } : {}),
      ...(filters?.resourceType ? { resourceType: filters.resourceType } : {}),
      ...(filters?.resourceId ? { resourceId: filters.resourceId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationToSkipTake(params),
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return toPaginatedResult(items, total, params);
  }
}

export const auditService = new AuditService();
