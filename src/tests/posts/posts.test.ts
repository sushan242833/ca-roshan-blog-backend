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
});
