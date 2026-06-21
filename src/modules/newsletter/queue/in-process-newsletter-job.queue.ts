import {
  NewsletterDeliveryJob,
  NewsletterJobQueue,
  NewsletterJobWorker,
} from "./newsletter-job-queue.interface";

const DEFAULT_RATE_LIMIT_PER_SECOND = 2;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class InProcessNewsletterJobQueue implements NewsletterJobQueue {
  private readonly pendingJobs: NewsletterDeliveryJob[] = [];
  private readonly intervalMs: number;
  private isRunning = false;

  constructor(
    private readonly worker: NewsletterJobWorker,
    rateLimitPerSecond: number = DEFAULT_RATE_LIMIT_PER_SECOND,
  ) {
    this.intervalMs = Math.ceil(1000 / Math.max(1, rateLimitPerSecond));
  }

  async enqueue(job: NewsletterDeliveryJob): Promise<void> {
    this.pendingJobs.push(job);

    if (!this.isRunning) {
      void this.drain();
    }
  }

  private async drain(): Promise<void> {
    this.isRunning = true;

    try {
      while (this.pendingJobs.length > 0) {
        const job = this.pendingJobs.shift();
        if (!job) {
          continue;
        }

        await this.processSafely(job);

        if (this.pendingJobs.length > 0) {
          await wait(this.intervalMs);
        }
      }
    } finally {
      this.isRunning = false;

      if (this.pendingJobs.length > 0) {
        void this.drain();
      }
    }
  }

  private async processSafely(job: NewsletterDeliveryJob): Promise<void> {
    try {
      await this.worker.process(job);
    } catch (error: unknown) {
      console.error("Newsletter job failed unexpectedly", error);
    }
  }
}
