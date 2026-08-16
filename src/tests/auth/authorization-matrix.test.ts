import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { env } from "@config/env";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import {
  createAdmin,
  createCategory,
  createPost,
  createTag,
  loginAdmin,
} from "../setup/test-helpers";

type Method = "post" | "patch" | "delete";

interface MutatingEndpoint {
  method: Method;
  /** Built per test run because most paths embed a freshly created id. */
  path: (ids: SeededIds) => string;
  body?: Record<string, unknown>;
  /** Expected status for a valid admin token. */
  okStatus: number;
}

interface SeededIds {
  postId: string;
  categoryId: string;
  tagId: string;
}

// Every state-changing endpoint the admin surface exposes. The point of the
// table is that adding a route without auth is a test failure, not a discovery
// made in production.
const MUTATING_ENDPOINTS: MutatingEndpoint[] = [
  {
    method: "post",
    path: () => "/api/v1/posts",
    body: { title: "Authz probe", content: "<p>body</p>" },
    okStatus: 201,
  },
  {
    method: "patch",
    path: (ids) => `/api/v1/posts/${ids.postId}`,
    body: { title: "Renamed by authz probe" },
    okStatus: 200,
  },
  {
    method: "post",
    path: (ids) => `/api/v1/posts/${ids.postId}/publish`,
    okStatus: 200,
  },
  {
    method: "post",
    path: (ids) => `/api/v1/posts/${ids.postId}/unpublish`,
    okStatus: 200,
  },
  {
    method: "post",
    path: (ids) => `/api/v1/posts/${ids.postId}/archive`,
    okStatus: 200,
  },
  {
    method: "post",
    path: (ids) => `/api/v1/posts/${ids.postId}/restore`,
    okStatus: 200,
  },
  {
    method: "post",
    path: (ids) => `/api/v1/posts/${ids.postId}/preview-token`,
    okStatus: 200,
  },
  {
    method: "delete",
    path: (ids) => `/api/v1/posts/${ids.postId}`,
    // Soft delete: returns the envelope rather than 204, unlike the taxonomy
    // deletes below.
    okStatus: 200,
  },
  {
    method: "post",
    path: () => "/api/v1/categories",
    body: { name: "Authz probe category" },
    okStatus: 201,
  },
  {
    method: "patch",
    path: (ids) => `/api/v1/categories/${ids.categoryId}`,
    body: { name: "Renamed category" },
    okStatus: 200,
  },
  {
    method: "delete",
    path: (ids) => `/api/v1/categories/${ids.categoryId}`,
    okStatus: 204,
  },
  {
    method: "post",
    path: () => "/api/v1/tags",
    body: { name: "Authz probe tag" },
    okStatus: 201,
  },
  {
    method: "patch",
    path: (ids) => `/api/v1/tags/${ids.tagId}`,
    body: { name: "Renamed tag" },
    okStatus: 200,
  },
  {
    method: "delete",
    path: (ids) => `/api/v1/tags/${ids.tagId}`,
    okStatus: 204,
  },
  {
    method: "delete",
    path: () => "/api/v1/media/00000000-0000-4000-8000-000000000000",
    // A valid admin reaches the handler and gets a 404 for the missing asset;
    // what matters here is that it is not a 401.
    okStatus: 404,
  },
];

async function seed(adminId: string): Promise<SeededIds> {
  const post = await createPost({ adminId });
  const category = await createCategory();
  const tag = await createTag();
  return { postId: post.id, categoryId: category.id, tagId: tag.id };
}

function send(method: Method, path: string, body?: Record<string, unknown>) {
  const request = createTestRequest()[method](path);
  return body ? request.send(body) : request;
}

describe("authorization matrix for mutating endpoints", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("rejects every mutating endpoint with no token (401)", async () => {
    const admin = await createAdmin();
    const ids = await seed(admin.admin.id);

    for (const endpoint of MUTATING_ENDPOINTS) {
      const response = await send(
        endpoint.method,
        endpoint.path(ids),
        endpoint.body,
      );
      assert.equal(
        response.status,
        401,
        `${endpoint.method.toUpperCase()} ${endpoint.path(ids)} returned ${response.status} without a token`,
      );
    }
  });

  it("rejects every mutating endpoint with a malformed token (401)", async () => {
    const admin = await createAdmin();
    const ids = await seed(admin.admin.id);

    for (const endpoint of MUTATING_ENDPOINTS) {
      const response = await send(
        endpoint.method,
        endpoint.path(ids),
        endpoint.body,
      ).set("Authorization", "Bearer not-a-real-token");
      assert.equal(
        response.status,
        401,
        `${endpoint.method.toUpperCase()} ${endpoint.path(ids)} accepted a malformed token`,
      );
    }
  });

  it("rejects a token signed with the wrong secret (401)", async () => {
    const admin = await createAdmin();
    const ids = await seed(admin.admin.id);
    const forged = jwt.sign({ id: admin.admin.id, type: "access" }, "wrong-secret", {
      expiresIn: "1h",
    });

    for (const endpoint of MUTATING_ENDPOINTS) {
      const response = await send(
        endpoint.method,
        endpoint.path(ids),
        endpoint.body,
      ).set("Authorization", `Bearer ${forged}`);
      assert.equal(
        response.status,
        401,
        `${endpoint.method.toUpperCase()} ${endpoint.path(ids)} accepted a forged token`,
      );
    }
  });

  it("rejects an expired token (401)", async () => {
    const admin = await createAdmin();
    const ids = await seed(admin.admin.id);
    const expired = jwt.sign(
      { id: admin.admin.id, type: "access" },
      env.JWT_SECRET,
      { expiresIn: "-1s" },
    );

    for (const endpoint of MUTATING_ENDPOINTS) {
      const response = await send(
        endpoint.method,
        endpoint.path(ids),
        endpoint.body,
      ).set("Authorization", `Bearer ${expired}`);
      assert.equal(
        response.status,
        401,
        `${endpoint.method.toUpperCase()} ${endpoint.path(ids)} accepted an expired token`,
      );
    }
  });

  it("rejects a refresh token used as an access token (401)", async () => {
    // Token-type confusion: a refresh token is long-lived and travels in a
    // cookie, so accepting one as a bearer credential would widen its blast
    // radius considerably.
    const admin = await createAdmin();
    const ids = await seed(admin.admin.id);
    const refreshShaped = jwt.sign(
      { id: admin.admin.id, type: "refresh" },
      env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    for (const endpoint of MUTATING_ENDPOINTS) {
      const response = await send(
        endpoint.method,
        endpoint.path(ids),
        endpoint.body,
      ).set("Authorization", `Bearer ${refreshShaped}`);
      assert.equal(
        response.status,
        401,
        `${endpoint.method.toUpperCase()} ${endpoint.path(ids)} accepted a refresh token`,
      );
    }
  });

  it("accepts every mutating endpoint with a valid admin token", async () => {
    // Proves the rejections above come from the auth check and not from the
    // routes being broken or unmounted.
    for (const endpoint of MUTATING_ENDPOINTS) {
      await setupIntegrationTest();
      const admin = await createAdmin();
      const login = await loginAdmin(admin);
      const ids = await seed(admin.admin.id);

      const response = await send(
        endpoint.method,
        endpoint.path(ids),
        endpoint.body,
      ).set("Authorization", `Bearer ${login.accessToken}`);

      assert.equal(
        response.status,
        endpoint.okStatus,
        `${endpoint.method.toUpperCase()} ${endpoint.path(ids)} returned ${response.status} for a valid admin`,
      );
    }
  });

  it("rejects unauthenticated reads of admin-only listings", async () => {
    const adminOnlyReads = [
      "/api/v1/media",
      "/api/v1/admin/subscribers",
      "/api/v1/admin/subscribers/stats",
      "/api/v1/posts/admin/list",
    ];

    for (const path of adminOnlyReads) {
      const response = await createTestRequest().get(path);
      assert.equal(
        response.status,
        401,
        `GET ${path} returned ${response.status} without a token`,
      );
    }
  });
});
