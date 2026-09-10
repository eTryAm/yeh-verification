import type { NotificationAdapter, NotificationPayload } from "./notification.port";

/**
 * V1 no-op notification adapter.
 * Logs notification payloads to stdout for observability.
 * Replace with a real email adapter in V1.1.
 */
export class NoopLogAdapter implements NotificationAdapter {
  async send(payload: NotificationPayload): Promise<void> {
    console.log("[Notification:noop]", JSON.stringify({
      type: payload.type,
      recipient: payload.recipientEmail,
      data: payload.data,
      timestamp: new Date().toISOString(),
    }));
  }
}

// Singleton instance
export const notificationAdapter: NotificationAdapter = new NoopLogAdapter();
