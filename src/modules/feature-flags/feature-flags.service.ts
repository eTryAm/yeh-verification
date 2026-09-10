import { prisma } from "@/infrastructure/db/prisma";
import { FeatureDisabledError } from "@/lib/errors";
import type { FeatureFlagKey } from "./feature-flags.constants";

// In-memory cache with TTL — avoids DB round-trip on every request
const cache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

export class FeatureFlagsService {
  async isEnabled(organizationId: string, key: FeatureFlagKey): Promise<boolean> {
    const cacheKey = `${organizationId}:${key}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.value;

    const flag = await prisma.featureFlag.findUnique({
      where: { organizationId_key: { organizationId, key } },
      select: { isEnabled: true },
    });

    const value = flag?.isEnabled ?? false;
    cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  async assertEnabled(organizationId: string, key: FeatureFlagKey): Promise<void> {
    const enabled = await this.isEnabled(organizationId, key);
    if (!enabled) throw new FeatureDisabledError(key);
  }

  async setFlag(
    organizationId: string,
    key: FeatureFlagKey,
    isEnabled: boolean,
    updatedBy: string
  ): Promise<void> {
    await prisma.featureFlag.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, isEnabled, updatedBy },
      update: { isEnabled, updatedBy },
    });
    cache.delete(`${organizationId}:${key}`);
  }

  async getAllFlags(organizationId: string) {
    return prisma.featureFlag.findMany({
      where: { organizationId },
      orderBy: { key: "asc" },
    });
  }
}

export const featureFlagsService = new FeatureFlagsService();
