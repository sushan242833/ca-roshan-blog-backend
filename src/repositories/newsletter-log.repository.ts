import { Transaction } from "sequelize";
import { NewsletterLog, Post, Subscriber } from "@models/index";
import {
  NewsletterLogCreationAttributes,
  NewsletterLogStatus,
} from "@models/newsletter-log.model";

export class NewsletterLogRepository {
  async createMany(
    payloads: NewsletterLogCreationAttributes[],
    transaction: Transaction,
  ): Promise<NewsletterLog[]> {
    if (payloads.length === 0) {
      return [];
    }

    return NewsletterLog.bulkCreate(payloads, {
      transaction,
      returning: true,
    });
  }

  async findDeliveryById(logId: string): Promise<NewsletterLog | null> {
    return NewsletterLog.findByPk(logId, {
      include: [
        { model: Subscriber },
        { model: Post },
      ],
    });
  }

  // Atomically claims a delivery for sending: flips PENDING -> SENT in a single
  // conditional UPDATE. Only one caller can win the row, so a re-enqueued or
  // concurrently-processed job never double-sends. Returns true for the winner.
  async claimForSending(logId: string): Promise<boolean> {
    const [affected] = await NewsletterLog.update(
      {
        status: NewsletterLogStatus.SENT,
        sentAt: new Date(),
        errorMessage: null,
      },
      { where: { id: logId, status: NewsletterLogStatus.PENDING } },
    );
    return affected > 0;
  }

  async markFailed(logId: string, errorMessage: string): Promise<void> {
    await NewsletterLog.update(
      {
        status: NewsletterLogStatus.FAILED,
        errorMessage,
      },
      { where: { id: logId } },
    );
  }
}

const newsletterLogRepository = new NewsletterLogRepository();

export default newsletterLogRepository;
