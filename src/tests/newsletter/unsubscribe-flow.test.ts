import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { env } from "@config/env";
import { NewsletterLog, Subscriber } from "@models/index";
import { NewsletterLogStatus } from "@models/newsletter-log.model";
import { PostStatus } from "@models/post.model";
import { SubscriberStatus } from "@models/subscriber.model";
import { NewsletterService } from "@services/newsletter.service";
import {
  EmailProvider,
  SendEmailPayload,
} from "@modules/newsletter/email/email-provider.interface";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, createPost, createSubscriber } from "../setup/test-helpers";

// Captures what would have been sent so the test can read the real unsubscribe
// URL out of the rendered email rather than reconstructing it — the whole point
// of P1-3 was that the URL in the email pointed somewhere that did not work.
class CapturingEmailProvider implements EmailProvider {
  readonly sent: SendEmailPayload[] = [];

  async sendEmail(payload: SendEmailPayload): Promise<void> {
    this.sent.push(payload);
  }
}

interface StatusBody {
  success: boolean;
  data: { status: SubscriberStatus; email?: string; id?: string };
}

/** Pulls the unsubscribe URL out of the email's plain-text part. */
function extractUnsubscribeUrl(payload: SendEmailPayload): string {
  const match = /Unsubscribe: (\S+)/.exec(payload.text ?? "");
  assert.ok(match, "newsletter email contained no unsubscribe URL");
  return match[1];
}

/**
 * Turns the absolute URL from the email into the request the frontend
 * unsubscribe page makes on the subscriber's behalf. Asserts along the way that
 * the link actually points at the app's confirmation page — the regression
 * itself was a link to the API's read-only GET endpoint, which rendered raw
 * JSON and left the subscriber subscribed.
 */
function tokenFromUnsubscribeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const appOrigin = new URL(env.APP_BASE_URL).origin;

  assert.equal(
    url.origin,
    appOrigin,
    "unsubscribe link must point at the frontend page, not the API",
  );
  assert.equal(url.pathname, "/unsubscribe");
  assert.ok(!url.pathname.includes("/api/"));

  const token = url.searchParams.get("token");
  assert.ok(token, "unsubscribe link carried no token");
  return token;
}

describe("newsletter unsubscribe flow", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("unsubscribes end to end from the link in a published post's newsletter", async () => {
    // 1-2. A verified, active subscriber.
    const admin = await createAdmin();
    const subscriber = await createSubscriber({
      status: SubscriberStatus.ACTIVE,
    });
    assert.equal(subscriber.status, SubscriberStatus.ACTIVE);

    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
    });

    // 3. Generate the newsletter email for that post.
    const emails = new CapturingEmailProvider();
    const service = new NewsletterService(undefined, undefined, emails);
    const log = await NewsletterLog.create({
      postId: post.id,
      subscriberId: subscriber.id,
      status: NewsletterLogStatus.PENDING,
    });
    await service.process({ logId: log.id });

    assert.equal(emails.sent.length, 1);

    // 4. Extract the unsubscribe URL from the email that was actually sent.
    const unsubscribeUrl = extractUnsubscribeUrl(emails.sent[0]);

    // 5. Follow it — the link resolves to the frontend page, which reads status.
    const token = tokenFromUnsubscribeUrl(unsubscribeUrl);
    const statusResponse = await createTestRequest()
      .get(`/api/v1/subscribers/unsubscribe/${token}`)
      .expect(200);
    assert.equal(
      (statusResponse.body as StatusBody).data.status,
      SubscriberStatus.ACTIVE,
    );

    // 6. Complete the flow — the page POSTs the confirmation.
    const unsubscribeResponse = await createTestRequest()
      .post(`/api/v1/subscribers/unsubscribe/${token}`)
      .expect(200);
    assert.equal(
      (unsubscribeResponse.body as StatusBody).data.status,
      SubscriberStatus.UNSUBSCRIBED,
    );

    // 7-8. The database agrees.
    const persisted = await Subscriber.findByPk(subscriber.id);
    assert.equal(persisted?.status, SubscriberStatus.UNSUBSCRIBED);

    // 9. A subsequent newsletter is not delivered to them.
    const secondPost = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "A second article",
    });
    const secondLog = await NewsletterLog.create({
      postId: secondPost.id,
      subscriberId: subscriber.id,
      status: NewsletterLogStatus.PENDING,
    });
    await service.process({ logId: secondLog.id });

    assert.equal(
      emails.sent.length,
      1,
      "an unsubscribed address must not receive further newsletters",
    );
    await secondLog.reload();
    assert.equal(secondLog.status, NewsletterLogStatus.FAILED);
  });

  it("activates a new subscriber immediately without a confirmation email", async () => {
    const emails = new CapturingEmailProvider();
    const service = new NewsletterService(undefined, undefined, emails);

    const subscribed = await service.subscribe({
      email: "no.confirm@example.test",
    });
    // Any afterCommit side effect would land here.
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(emails.sent.length, 0);
    assert.equal(subscribed.status, SubscriberStatus.ACTIVE);

    const persisted = await Subscriber.findByPk(subscribed.id);
    assert.equal(persisted?.status, SubscriberStatus.ACTIVE);
    assert.ok(persisted?.unsubscribeToken);
  });

  it("does not echo the subscriber's email back to an unauthenticated caller", async () => {
    const subscriber = await createSubscriber({
      status: SubscriberStatus.ACTIVE,
    });

    const response = await createTestRequest()
      .get(`/api/v1/subscribers/unsubscribe/${subscriber.unsubscribeToken}`)
      .expect(200);
    const body = response.body as StatusBody;

    assert.equal(body.data.status, SubscriberStatus.ACTIVE);
    assert.equal(body.data.email, undefined);
    assert.equal(body.data.id, undefined);
  });

  it("is idempotent — unsubscribing twice succeeds and stays unsubscribed", async () => {
    const subscriber = await createSubscriber({
      status: SubscriberStatus.ACTIVE,
    });
    const token = subscriber.unsubscribeToken;

    await createTestRequest()
      .post(`/api/v1/subscribers/unsubscribe/${token}`)
      .expect(200);
    const second = await createTestRequest()
      .post(`/api/v1/subscribers/unsubscribe/${token}`)
      .expect(200);

    assert.equal(
      (second.body as StatusBody).data.status,
      SubscriberStatus.UNSUBSCRIBED,
    );
    const persisted = await Subscriber.findByPk(subscriber.id);
    assert.equal(persisted?.status, SubscriberStatus.UNSUBSCRIBED);
  });

  it("reports an already-unsubscribed address as unsubscribed rather than erroring", async () => {
    const subscriber = await createSubscriber({
      status: SubscriberStatus.UNSUBSCRIBED,
    });

    const response = await createTestRequest()
      .get(`/api/v1/subscribers/unsubscribe/${subscriber.unsubscribeToken}`)
      .expect(200);

    assert.equal(
      (response.body as StatusBody).data.status,
      SubscriberStatus.UNSUBSCRIBED,
    );
  });

  it("rejects an unknown unsubscribe token with 404", async () => {
    await createTestRequest()
      .get(`/api/v1/subscribers/unsubscribe/${"a".repeat(64)}`)
      .expect(404);
    await createTestRequest()
      .post(`/api/v1/subscribers/unsubscribe/${"a".repeat(64)}`)
      .expect(404);
  });

  it("rejects a malformed unsubscribe token before it reaches the database", async () => {
    for (const token of ["short", "not-a-hex-token", "%20", "../../etc/passwd"]) {
      const response = await createTestRequest().post(
        `/api/v1/subscribers/unsubscribe/${encodeURIComponent(token)}`,
      );
      assert.ok(
        response.status === 400 || response.status === 404,
        `malformed token "${token}" returned ${response.status}`,
      );
    }
  });

  it("does not unsubscribe anyone when a reused token has been rotated away", async () => {
    const subscriber = await createSubscriber({
      status: SubscriberStatus.ACTIVE,
    });
    const oldToken = subscriber.unsubscribeToken;

    subscriber.unsubscribeToken = "b".repeat(64);
    await subscriber.save();

    await createTestRequest()
      .post(`/api/v1/subscribers/unsubscribe/${oldToken}`)
      .expect(404);

    const persisted = await Subscriber.findByPk(subscriber.id);
    assert.equal(persisted?.status, SubscriberStatus.ACTIVE);
  });
});
