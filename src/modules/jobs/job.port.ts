/**
 * JobAdapter interface — abstraction over BullMQ.
 * Allows the same job-enqueueing API regardless of underlying infrastructure.
 */

export interface JobOptions {
  /** Number of retry attempts on failure */
  attempts?: number;
  /** Backoff strategy between retries */
  backoff?: { type: "exponential" | "fixed"; delay: number };
  /** Delay before job starts (ms) */
  delay?: number;
  /** Unique job ID — prevents duplicate enqueuing */
  jobId?: string;
}

export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "unknown";

export interface JobAdapter {
  enqueue<T>(
    queue: string,
    jobName: string,
    payload: T,
    options?: JobOptions
  ): Promise<string>;

  getJobStatus(queue: string, jobId: string): Promise<JobStatus>;
}

// ─── Queue and job name constants ──────────────────────────────────────────────

export const Queues = {
  CREDENTIALS: "credentials",
  IMPORTS: "imports",
  NOTIFICATIONS: "notifications",
} as const;

export const Jobs = {
  // credentials queue
  GENERATE_PDF: "generate-pdf",
  GENERATE_QR: "generate-qr",
  BULK_ISSUE: "bulk-issue",
  EXPIRE_CREDENTIALS: "expire-credentials",
  // imports queue
  PROCESS_IMPORT_BATCH: "process-import-batch",
  // notifications queue
  SEND_NOTIFICATION: "send-notification",
} as const;
