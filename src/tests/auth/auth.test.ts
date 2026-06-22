import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin } from "../setup/test-helpers";

interface LoginResponseBody {
  success: boolean;
  data: {
    accessToken: string;
    admin: {
      id: string;
      email: string;
    };
  };
}

describe("auth", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("logs in an admin with valid credentials", async () => {
    const admin = await createAdmin();

    const response = await createTestRequest()
      .post("/api/auth/login")
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    const body = response.body as LoginResponseBody;

    assert.equal(body.success, true);
    assert.equal(body.data.admin.email, admin.email);
    assert.equal(typeof body.data.accessToken, "string");
    assert.ok(body.data.accessToken.length > 0);
  });
});
