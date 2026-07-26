import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";

describe("subscribe rate limit", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  // The emailLimiter caps subscribe at 5 requests/hour/IP. Invalid bodies are
  // used so the first requests are rejected by validation (400) without sending
  // any email — the limiter still counts them, so the 6th attempt is blocked.
  it("returns 429 on the 6th subscribe attempt within the window", async () => {
    for (let i = 0; i < 5; i += 1) {
      await createTestRequest()
        .post("/api/v1/subscribers")
        .send({})
        .expect(400);
    }

    await createTestRequest().post("/api/v1/subscribers").send({}).expect(429);
  });
});
