import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";

interface HealthResponseBody {
  success: boolean;
  message: string;
}

describe("health", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("returns a healthy response", async () => {
    const response = await createTestRequest().get("/health").expect(200);
    const body = response.body as HealthResponseBody;

    assert.equal(body.success, true);
    assert.equal(body.message, "Server is running");
  });
});
