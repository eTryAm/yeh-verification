export interface CreateParticipantInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  institution?: string;
  course?: string;
  graduationYear?: number;
  city?: string;
  state?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateParticipantInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  institution?: string;
  course?: string;
  graduationYear?: number;
  city?: string;
  state?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}
