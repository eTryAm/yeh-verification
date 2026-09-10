import { prisma } from "@/infrastructure/db/prisma";
import { CredentialStatus } from "@prisma/client";

export interface DashboardStats {
  totalCredentials: number;
  issuedThisMonth: number;
  totalParticipants: number;
  pendingImports: number;
  credentialsByStatus: Record<string, number>;
  recentActivity: Array<{ date: string; count: number }>;
}

export class AnalyticsService {
  async getDashboardStats(organizationId: string): Promise<DashboardStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCredentials,
      issuedThisMonth,
      totalParticipants,
      pendingImports,
      statusGroups,
    ] = await Promise.all([
      prisma.credential.count({ where: { organizationId } }),
      prisma.credential.count({
        where: {
          organizationId,
          status: CredentialStatus.VALID,
          issueDate: { gte: startOfMonth },
        },
      }),
      prisma.participant.count({ where: { organizationId, isActive: true } }),
      prisma.importBatch.count({
        where: {
          organizationId,
          status: { in: ["PENDING", "AWAITING_APPROVAL", "PROCESSING"] as never },
        },
      }),
      prisma.credential.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: true,
      }),
    ]);

    const credentialsByStatus: Record<string, number> = {};
    for (const group of statusGroups) {
      credentialsByStatus[group.status] = group._count;
    }

    // Last 30 days activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent = await prisma.credential.findMany({
      where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const activityMap = new Map<string, number>();
    for (const c of recent) {
      const day = c.createdAt.toISOString().slice(0, 10);
      activityMap.set(day, (activityMap.get(day) ?? 0) + 1);
    }

    const recentActivity = Array.from(activityMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      totalCredentials,
      issuedThisMonth,
      totalParticipants,
      pendingImports,
      credentialsByStatus,
      recentActivity,
    };
  }
}

export const analyticsService = new AnalyticsService();
