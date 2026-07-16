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

interface PostListResponseBody {
  success: boolean;
  data: {
    items: { id: string; slug: string; title: string }[];
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

  // Task 3: search matches the post body, not only title/excerpt. The token
  // appears ONLY in content (createPost hardcodes title/excerpt without it),
  // so a hit proves buildSearchWhere now includes the content column.
  it("finds a published post by a term that appears only in its content", async () => {
    const admin = await createAdmin();
    const token = "quantumleviededuction";
    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "An Unrelated Heading",
      content: `<p>Deep in the article body we mention ${token} exactly once.</p>`,
    });

    const response = await createTestRequest()
      .get(`/api/v1/posts?search=${token}`)
      .expect(200);
    const body = response.body as PostListResponseBody;

    assert.equal(body.success, true);
    assert.ok(
      body.data.items.some((item) => item.id === post.id),
      "expected the content-only match to be returned",
    );
  });
});
