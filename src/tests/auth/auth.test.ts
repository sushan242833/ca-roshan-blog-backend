import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { env } from "@config/env";
import { Admin } from "@models/index";
import authService from "@services/auth.service";
import { ValidationError } from "@errors/http-error";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, loginAdmin } from "../setup/test-helpers";

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
      .post("/api/v1/auth/login")
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    const body = response.body as LoginResponseBody;

    assert.equal(body.success, true);
    assert.equal(body.data.admin.email, admin.email);
    assert.equal(typeof body.data.accessToken, "string");
    assert.ok(body.data.accessToken.length > 0);
  });

  it("rejects a non-access token on a protected route", async () => {
    const admin = await createAdmin();
    const previewLikeToken = jwt.sign(
      { sub: admin.admin.id, type: "preview" },
      env.JWT_SECRET,
      { expiresIn: "15m", algorithm: "HS256" },
    );

    await createTestRequest()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${previewLikeToken}`)
      .expect(401);
  });

  it("rejects a token signed with a foreign secret", async () => {
    const admin = await createAdmin();
    const forged = jwt.sign(
      { sub: admin.admin.id, type: "access" },
      "not-the-real-secret",
      { expiresIn: "15m", algorithm: "HS256" },
    );

    await createTestRequest()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${forged}`)
      .expect(401);
  });

  it("stamps a session cut-off on logout", async () => {
    const admin = await createAdmin();
    const { accessToken } = await loginAdmin(admin);

    await createTestRequest()
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const reloaded = await Admin.findByPk(admin.admin.id);
    assert.ok(reloaded?.sessionsInvalidatedAt instanceof Date);
    assert.equal(reloaded?.refreshTokenHash, null);
  });

  it("stamps a session cut-off on password change", async () => {
    const admin = await createAdmin();
    const { accessToken } = await loginAdmin(admin);

    await createTestRequest()
      .post("/api/v1/auth/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: admin.password,
        newPassword: "ReplacementPassword123",
      })
      .expect(200);

    const reloaded = await Admin.findByPk(admin.admin.id);
    assert.ok(reloaded?.sessionsInvalidatedAt instanceof Date);
    assert.equal(reloaded?.refreshTokenHash, null);
  });

  it("rejects an access token issued before the session cut-off", async () => {
    const admin = await createAdmin();
    const { accessToken } = await loginAdmin(admin);

    await createTestRequest()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    // Written directly, and in the future, so the assertion does not depend on
    // how many milliseconds the login above took — see the same-second case
    // below for why a cut-off written *now* would not reject this token.
    await Admin.update(
      { sessionsInvalidatedAt: new Date(Date.now() + 5_000) },
      { where: { id: admin.admin.id } },
    );

    await createTestRequest()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(401);
  });

  // The cut-off is compared at `iat`'s one-second resolution, so a token minted
  // in the same second as a logout survives it. That tolerance is deliberate:
  // the alternative rejects the genuine token from a login that lands in the
  // same second as the logout before it, which is what this asserts.
  it("accepts a fresh login in the same second as the logout before it", async () => {
    const admin = await createAdmin();
    const first = await loginAdmin(admin);

    await createTestRequest()
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${first.accessToken}`)
      .expect(200);

    const second = await loginAdmin(admin);

    await createTestRequest()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${second.accessToken}`)
      .expect(200);
  });

  it("rejects admin creation with a too-short password", async () => {
    await assert.rejects(
      () =>
        authService.createAdmin({
          name: "Shorty",
          email: "shorty@example.test",
          password: "short",
        }),
      ValidationError,
    );
  });
});
