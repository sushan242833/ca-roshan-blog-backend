import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { NewsletterLog } from "@models/index";
import { NewsletterLogStatus } from "@models/newsletter-log.model";
import { PostStatus } from "@models/post.model";
import { SubscriberStatus } from "@models/subscriber.model";
import newsletterLogRepository from "@repositories/newsletter-log.repository";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, createPost, createSubscriber, loginAdmin } from "../setup/test-helpers";

describe("newsletter idempotency", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("does not re-send the newsletter when a post is republished", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    await createSubscriber({ status: SubscriberStatus.ACTIVE });
    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.DRAFT,
    });
    const auth = { Authorization: `Bearer ${login.accessToken}` };

    await createTestRequest()
      .post(`/api/v1/posts/${post.id}/publish`)
      .set(auth)
      .expect(200);
    assert.equal(await NewsletterLog.count({ where: { postId: post.id } }), 1);

    await createTestRequest()
      .post(`/api/v1/posts/${post.id}/unpublish`)
      .set(auth)
      .expect(200);
    await createTestRequest()
      .post(`/api/v1/posts/${post.id}/publish`)
      .set(auth)
      .expect(200);

    assert.equal(
      await NewsletterLog.count({ where: { postId: post.id } }),
      1,
      "republishing must not create a second batch of delivery logs",
    );
  });

  it("claims a delivery atomically — a second claim loses", async () => {
    const admin = await createAdmin();
    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
    });
    const subscriber = await createSubscriber({ status: SubscriberStatus.ACTIVE });
    const log = await NewsletterLog.create({
      postId: post.id,
      subscriberId: subscriber.id,
      status: NewsletterLogStatus.PENDING,
    });

    const first = await newsletterLogRepository.claimForSending(log.id);
    const second = await newsletterLogRepository.claimForSending(log.id);

    assert.equal(first, true);
    assert.equal(second, false);
    await log.reload();
    assert.equal(log.status, NewsletterLogStatus.SENT);
  });
});
