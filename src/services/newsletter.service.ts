import { randomBytes } from "crypto";
import { Transaction, UniqueConstraintError } from "sequelize";
import { env } from "@config/env";
import {
  CreateSubscriberDto,
  SubscriberListFilters,
  SubscriberResponse,
  SubscriberStatsResponse,
  toSubscriberResponse,
} from "@dto/subscriber.dto";
import { PaginatedResponse } from "@dto/pagination.dto";
import {
  ConflictError,
  GoneError,
  NotFoundError,
  ValidationError,
} from "@errors/http-error";
import { NewsletterLogStatus } from "@models/newsletter-log.model";
import { PostStatus } from "@models/post.model";
import { Subscriber, SubscriberStatus } from "@models/subscriber.model";
import {
  buildPostNewsletterEmail,
  buildVerificationEmail,
} from "@modules/newsletter/email/newsletter-email.templates";
import {
  EmailProvider,
  SendEmailPayload,
} from "@modules/newsletter/email/email-provider.interface";
import resendEmailProvider from "@modules/newsletter/email/resend-email.provider";
import { InProcessNewsletterJobQueue } from "@modules/newsletter/queue/in-process-newsletter-job.queue";
import {
  NewsletterDeliveryJob,
  NewsletterJobQueue,
  NewsletterJobWorker,
} from "@modules/newsletter/queue/newsletter-job-queue.interface";
import newsletterLogRepository, {
  NewsletterLogRepository,
} from "@repositories/newsletter-log.repository";
import subscriberRepository, {
  SubscriberRepository,
} from "@repositories/subscriber.repository";

const TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVE_SUBSCRIBER_BATCH_SIZE = 500;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalized) || normalized.length > 320) {
    throw new ValidationError([
      { field: "email", message: "email must be a valid email address." },
    ]);
  }

  return normalized;
}

function buildUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(normalizedPath, normalizedBaseUrl).toString();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.slice(0, 2000);
  }

  return "Unknown newsletter delivery error.";
}

function pagination<T>(
  rows: T[],
  count: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    items: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export class NewsletterService implements NewsletterJobWorker {
  private readonly queue: NewsletterJobQueue;

  constructor(
    private readonly subscribers: SubscriberRepository = subscriberRepository,
    private readonly logs: NewsletterLogRepository = newsletterLogRepository,
    private readonly emailProvider: EmailProvider = resendEmailProvider,
    queue?: NewsletterJobQueue,
  ) {
    this.queue =
      queue ??
      new InProcessNewsletterJobQueue(
        this,
        env.NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND,
      );
  }

  async subscribe(dto: CreateSubscriberDto): Promise<SubscriberResponse> {
    try {
      return await this.subscribers.transaction(async (transaction) => {
        const email = normalizeEmail(dto.email);
        const existing = await this.subscribers.findByEmail(email, {
          transaction,
          includeDeleted: true,
        });
        const verificationToken = createToken();
        const verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
        const unsubscribeToken = existing?.unsubscribeToken ?? createToken();

        if (
          existing &&
          !existing.deletedAt &&
          (existing.status === SubscriberStatus.ACTIVE ||
            existing.status === SubscriberStatus.PENDING)
        ) {
          throw new ConflictError("Email is already subscribed.");
        }

        const subscriber = existing
          ? await this.resetExistingSubscriber(
              existing,
              verificationToken,
              unsubscribeToken,
              transaction,
            )
          : await this.subscribers.create(
              {
                email,
                status: SubscriberStatus.PENDING,
                verificationToken,
                verificationTokenExpiresAt,
                unsubscribeToken,
              },
              transaction,
            );

        const emailPayload = this.buildVerificationEmailPayload(
          subscriber.email,
          verificationToken,
          unsubscribeToken,
        );

        transaction.afterCommit(async () => {
          await this.emailProvider.sendEmail(emailPayload);
        });

        return toSubscriberResponse(subscriber);
      });
    } catch (error: unknown) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictError("Email is already subscribed.");
      }

      throw error;
    }
  }

  async verify(token: string): Promise<SubscriberResponse> {
    const subscriber = await this.subscribers.findByVerificationToken(token);
    if (!subscriber) {
      throw new NotFoundError("Verification token not found.");
    }

    if (
      subscriber.verificationTokenExpiresAt &&
      subscriber.verificationTokenExpiresAt < new Date()
    ) {
      throw new GoneError(
        "Verification link has expired. Please subscribe again to receive a new link.",
      );
    }

    subscriber.status = SubscriberStatus.ACTIVE;
    subscriber.verifiedAt = new Date();
    subscriber.verificationToken = null;
    subscriber.verificationTokenExpiresAt = null;

    if (!subscriber.unsubscribeToken) {
      subscriber.unsubscribeToken = createToken();
    }

    return toSubscriberResponse(await this.subscribers.save(subscriber));
  }

  async unsubscribe(token: string): Promise<SubscriberResponse> {
    const subscriber = await this.subscribers.findByUnsubscribeToken(token);
    if (!subscriber) {
      throw new NotFoundError("Unsubscribe token not found.");
    }

    subscriber.status = SubscriberStatus.UNSUBSCRIBED;
    subscriber.verificationToken = null;

    return toSubscriberResponse(await this.subscribers.save(subscriber));
  }

  async adminList(
    filters: SubscriberListFilters,
  ): Promise<PaginatedResponse<SubscriberResponse>> {
    const { rows, count } = await this.subscribers.adminList(filters);
    return pagination(
      rows.map(toSubscriberResponse),
      count,
      filters.page,
      filters.limit,
    );
  }

  async stats(): Promise<SubscriberStatsResponse> {
    const [total, pending, active, unsubscribed] = await Promise.all([
      this.subscribers.count(),
      this.subscribers.count(SubscriberStatus.PENDING),
      this.subscribers.count(SubscriberStatus.ACTIVE),
      this.subscribers.count(SubscriberStatus.UNSUBSCRIBED),
    ]);

    return { total, pending, active, unsubscribed };
  }

  async schedulePostPublished(
    postId: string,
    transaction: Transaction,
  ): Promise<void> {
    const jobs: NewsletterDeliveryJob[] = [];
    let offset = 0;

    while (true) {
      const activeSubscribers = await this.subscribers.findActiveBatch(
        ACTIVE_SUBSCRIBER_BATCH_SIZE,
        offset,
        transaction,
      );

      if (activeSubscribers.length === 0) {
        break;
      }

      const logs = await this.logs.createMany(
        activeSubscribers.map((subscriber) => ({
          postId,
          subscriberId: subscriber.id,
          status: NewsletterLogStatus.PENDING,
        })),
        transaction,
      );
      jobs.push(...logs.map((log) => ({ logId: log.id })));

      if (activeSubscribers.length < ACTIVE_SUBSCRIBER_BATCH_SIZE) {
        break;
      }

      offset += activeSubscribers.length;
    }

    if (jobs.length === 0) {
      return;
    }

    transaction.afterCommit(async () => {
      await Promise.all(jobs.map((job) => this.queue.enqueue(job)));
    });
  }

  async process(job: NewsletterDeliveryJob): Promise<void> {
    const log = await this.logs.findDeliveryById(job.logId);
    if (!log || log.status !== NewsletterLogStatus.PENDING) {
      return;
    }

    if (!log.subscriber) {
      await this.logs.markFailed(log.id, "Subscriber could not be loaded.");
      return;
    }

    if (!log.post) {
      await this.logs.markFailed(log.id, "Post could not be loaded.");
      return;
    }

    if (log.subscriber.status !== SubscriberStatus.ACTIVE) {
      await this.logs.markFailed(log.id, "Subscriber is not active.");
      return;
    }

    if (log.post.status !== PostStatus.PUBLISHED) {
      await this.logs.markFailed(log.id, "Post is not published.");
      return;
    }

    try {
      await this.emailProvider.sendEmail(
        this.buildPostNewsletterEmailPayload(
          log.subscriber.email,
          log.subscriber.unsubscribeToken,
          log.post.title,
          log.post.excerpt ?? null,
          log.post.slug,
        ),
      );
      await this.logs.markSent(log.id);
    } catch (error: unknown) {
      await this.logs.markFailed(log.id, getErrorMessage(error));
    }
  }

  private async resetExistingSubscriber(
    subscriber: Subscriber,
    verificationToken: string,
    unsubscribeToken: string,
    transaction: Transaction,
  ) {
    if (subscriber.deletedAt) {
      await this.subscribers.restore(subscriber, transaction);
    }

    subscriber.status = SubscriberStatus.PENDING;
    subscriber.verificationToken = verificationToken;
    subscriber.verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    subscriber.unsubscribeToken = unsubscribeToken;
    subscriber.verifiedAt = null;

    return this.subscribers.save(subscriber, transaction);
  }

  private buildVerificationEmailPayload(
    email: string,
    verificationToken: string,
    unsubscribeToken: string,
  ): SendEmailPayload {
    return buildVerificationEmail({
      email,
      verificationUrl: buildUrl(
        env.API_BASE_URL,
        `/api/v1/subscribers/verify/${encodeURIComponent(verificationToken)}`,
      ),
      unsubscribeUrl: buildUrl(
        env.API_BASE_URL,
        `/api/v1/subscribers/unsubscribe/${encodeURIComponent(unsubscribeToken)}`,
      ),
    });
  }

  private buildPostNewsletterEmailPayload(
    email: string,
    unsubscribeToken: string,
    postTitle: string,
    postExcerpt: string | null,
    postSlug: string,
  ): SendEmailPayload {
    return buildPostNewsletterEmail({
      email,
      postTitle,
      postExcerpt,
      postUrl: buildUrl(env.APP_BASE_URL, `/posts/${encodeURIComponent(postSlug)}`),
      unsubscribeUrl: buildUrl(
        env.API_BASE_URL,
        `/api/v1/subscribers/unsubscribe/${encodeURIComponent(unsubscribeToken)}`,
      ),
    });
  }
}

const newsletterService = new NewsletterService();

export default newsletterService;
