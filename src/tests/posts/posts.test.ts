import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { PostStatus } from "@models/post.model";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, createPost, loginAdmin } from "../setup/test-helpers";

interface PostResponseBody {
  success: boolean;
  data: {
    id: string;
    status: PostStatus;
    publishedAt: string | null;
  };
}

interface PostDetailResponseBody {
  success: boolean;
  data: {
    id: string;
    status: PostStatus;
    content: string;
    viewCount: number;
  };
}

describe("posts", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("publishes a draft post as an authenticated admin", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const post = await createPost({ adminId: admin.admin.id });

    const response = await createTestRequest()
      .post(`/api/v1/posts/${post.id}/publish`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const body = response.body as PostResponseBody;

    assert.equal(body.success, true);
    assert.equal(body.data.id, post.id);
    assert.equal(body.data.status, PostStatus.PUBLISHED);
    assert.notEqual(body.data.publishedAt, null);
  });

  it("fetches a draft post by id with content as an authenticated admin", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const post = await createPost({
      adminId: admin.admin.id,
      content: "<p>Draft body for the editor.</p>",
    });

    const response = await createTestRequest()
      .get(`/api/v1/posts/admin/${post.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const body = response.body as PostDetailResponseBody;

    assert.equal(body.success, true);
    assert.equal(body.data.id, post.id);
    assert.equal(body.data.status, PostStatus.DRAFT);
    assert.equal(body.data.content, "<p>Draft body for the editor.</p>");

    // Unlike the public GET /:slug, the admin fetch must not count a view.
    await post.reload();
    assert.equal(post.viewCount, 0);
  });

  it("rejects an unauthenticated admin post fetch", async () => {
    const admin = await createAdmin();
    const post = await createPost({ adminId: admin.admin.id });

    await createTestRequest().get(`/api/v1/posts/admin/${post.id}`).expect(401);
  });

  it("returns 404 for a non-UUID admin post id", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    await createTestRequest()
      .get("/api/v1/posts/admin/not-a-uuid")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(404);
  });
});
