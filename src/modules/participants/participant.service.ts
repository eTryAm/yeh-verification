import { participantRepository } from "./participant.repository";
import { auditService } from "@/modules/audit/audit.service";
import { NotFoundError, DuplicateError } from "@/lib/errors";
import { generateParticipantCode } from "@/lib/participant-code.generator";
import type { CreateParticipantInput, UpdateParticipantInput } from "./participant.types";
import type { PaginationParams } from "@/lib/pagination";
import type { SessionUser } from "@/modules/rbac/enforce";

export class ParticipantService {
  async getById(id: string, user: SessionUser) {
    const participant = await participantRepository.findById(id, user.organizationId);
    if (!participant) throw new NotFoundError("Participant", id);
    return participant;
  }

  async list(user: SessionUser, params: PaginationParams, search?: string) {
    return participantRepository.findAll(user.organizationId, params, search);
  }

  async create(input: CreateParticipantInput, user: SessionUser) {
    if (input.email) {
      const existing = await participantRepository.findByEmail(
        input.email,
        user.organizationId
      );
      if (existing) throw new DuplicateError("participant", "email");
    }

    const participantCode = await generateParticipantCode();

    const participant = await participantRepository.create({
      ...input,
      participantCode,
      country: input.country ?? "India",
      metadata: (input.metadata ?? {}) as never,
      organization: { connect: { id: user.organizationId } },
    });

    await auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "PARTICIPANT_CREATED",
      resourceType: "Participant",
      resourceId: participant.id,
      result: "SUCCESS",
    });

    return participant;
  }

  async update(id: string, input: UpdateParticipantInput, user: SessionUser) {
    await this.getById(id, user); // verify ownership

    const updated = await participantRepository.update(id, {
      ...input,
      metadata: (input.metadata ?? {}) as never,
      updatedAt: new Date(),
    });

    await auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "PARTICIPANT_UPDATED",
      resourceType: "Participant",
      resourceId: id,
      result: "SUCCESS",
    });

    return updated;
  }
}

export const participantService = new ParticipantService();
