import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { SubscriberStatus } from "@models/subscriber.model";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createSubscriber } from "../setup/test-helpers";

interface SubscriberResponseBody {
  success: boolean;
  data: {
    id: string;
    email: string;
    status: SubscriberStatus;
    verifiedAt: string | null;
  };
}

describe("newsletter", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("verifies a pending subscriber", async () => {
    const subscriber = await createSubscriber({
      status: SubscriberStatus.PENDING,
    });

    assert.ok(subscriber.verificationToken);

    const response = await createTestRequest()
      .get(`/api/v1/subscribers/verify/${subscriber.verificationToken}`)
      .expect(200);
    const body = response.body as SubscriberResponseBody;

    assert.equal(body.success, true);
    assert.equal(body.data.email, subscriber.email);
    assert.equal(body.data.status, SubscriberStatus.ACTIVE);
    assert.notEqual(body.data.verifiedAt, null);
  });
});
