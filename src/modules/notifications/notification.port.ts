/**
 * NotificationAdapter interface.
 * V1 implementation: NoopLogAdapter (logs to stdout).
 * V1.1: Swap in ResendAdapter or SendGridAdapter without touching callers.
 */
export type NotificationType =
  | "CREDENTIAL_ISSUED"
  | "CREDENTIAL_REVOKED"
  | "IMPORT_COMPLETED"
  | "IMPORT_FAILED"
  | "ACCOUNT_CREATED";

export interface NotificationPayload {
  recipientEmail: string;
  recipientName: string;
  type: NotificationType;
  data: Record<string, unknown>;
}

export interface NotificationAdapter {
  send(payload: NotificationPayload): Promise<void>;
}
