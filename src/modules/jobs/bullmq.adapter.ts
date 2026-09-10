import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { JobAdapter, JobOptions, JobStatus } from "./job.port";

function getRedisConnection(): IORedis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new IORedis(url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
  });
}

// Shared Redis connection for BullMQ
let _redis: IORedis | null = null;

export function getRedisConnection_(): IORedis {
  if (!_redis) _redis = getRedisConnection();
  return _redis;
}

// Queue registry — lazily created
const _queues = new Map<string, Queue>();

function getQueue(name: string): Queue {
  if (!_queues.has(name)) {
    _queues.set(
      name,
      new Queue(name, { connection: getRedisConnection_() })
    );
  }
  return _queues.get(name)!;
}

export class BullMQJobAdapter implements JobAdapter {
  async enqueue<T>(
    queue: string,
    jobName: string,
    payload: T,
    options: JobOptions = {}
  ): Promise<string> {
    const q = getQueue(queue);
    const job = await q.add(jobName, payload, {
      jobId: options.jobId,
      delay: options.delay,
      attempts: options.attempts ?? 3,
      backoff: options.backoff ?? { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    });
    return job.id ?? "";
  }

  async getJobStatus(queue: string, jobId: string): Promise<JobStatus> {
    const q = getQueue(queue);
    const job = await q.getJob(jobId);
    if (!job) return "unknown";
    const state = await job.getState();
    return state as JobStatus;
  }
}

// Singleton
let _adapter: BullMQJobAdapter | null = null;

export function getJobAdapter(): JobAdapter {
  if (!_adapter) _adapter = new BullMQJobAdapter();
  return _adapter;
}
