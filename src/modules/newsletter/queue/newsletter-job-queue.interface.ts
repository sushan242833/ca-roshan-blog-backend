export interface NewsletterDeliveryJob {
  logId: string;
}

export interface NewsletterJobWorker {
  process(job: NewsletterDeliveryJob): Promise<void>;
}

export interface NewsletterJobQueue {
  enqueue(job: NewsletterDeliveryJob): Promise<void>;
}
