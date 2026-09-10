import { prisma } from "@/infrastructure/db/prisma";
import type { Participant, Prisma } from "@prisma/client";
import {
  paginationToSkipTake,
  toPaginatedResult,
  type PaginationParams,
  type PaginatedResult,
} from "@/lib/pagination";

export class ParticipantRepository {
  async findById(id: string, organizationId: string): Promise<Participant | null> {
    return prisma.participant.findFirst({ where: { id, organizationId } });
  }

  async findByEmail(email: string, organizationId: string): Promise<Participant | null> {
    return prisma.participant.findFirst({ where: { email, organizationId } });
  }

  async findAll(
    organizationId: string,
    params: PaginationParams,
    search?: string
  ): Promise<PaginatedResult<Participant>> {
    const where: Prisma.ParticipantWhereInput = {
      organizationId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { institution: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.participant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationToSkipTake(params),
      }),
      prisma.participant.count({ where }),
    ]);

    return toPaginatedResult(items, total, params);
  }

  async create(data: Prisma.ParticipantCreateInput): Promise<Participant> {
    return prisma.participant.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ParticipantUpdateInput
  ): Promise<Participant> {
    return prisma.participant.update({ where: { id }, data });
  }
}

export const participantRepository = new ParticipantRepository();
