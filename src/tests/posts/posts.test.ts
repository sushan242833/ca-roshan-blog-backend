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

interface PostPdfResponseBody {
  success: boolean;
  data: {
    id: string;
    pdfUrl: string | null;
    pdfLabel: string | null;
  };
}

interface PostShowFeaturedImageResponseBody {
  success: boolean;
  data: {
    id: string;
    showFeaturedImage: boolean;
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

  // Full content PDF: create accepts pdfUrl + pdfLabel and echoes them back.
  it("creates a post with a full-content PDF url and label", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    const response = await createTestRequest()
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .send({
        title: "Post With PDF",
        content: "<p>Short summary; the full version is attached.</p>",
        pdfUrl: "https://example.com/reports/full.pdf",
        pdfLabel: "Download the full report (PDF)",
      })
      .expect(201);
    const body = response.body as PostPdfResponseBody;

    assert.equal(body.data.pdfUrl, "https://example.com/reports/full.pdf");
    assert.equal(body.data.pdfLabel, "Download the full report (PDF)");
  });

  // A relative /uploads/ path (self-hosted media) is accepted too.
  it("accepts a relative /uploads/ pdf path", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    const response = await createTestRequest()
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .send({
        title: "Self Hosted PDF",
        content: "<p>Body.</p>",
        pdfUrl: "/uploads/9f8e7d6c-5b4a-4938-8271-605040302010.pdf",
      })
      .expect(201);
    const body = response.body as PostPdfResponseBody;

    assert.equal(
      body.data.pdfUrl,
      "/uploads/9f8e7d6c-5b4a-4938-8271-605040302010.pdf",
    );
  });

  it("rejects a post with an invalid (non-http, non-/uploads) pdf url", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    await createTestRequest()
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .send({
        title: "Bad PDF",
        content: "<p>Body.</p>",
        pdfUrl: "javascript:alert(1)",
      })
      .expect(400);
  });

  // Sending null on update clears both fields — the "Remove PDF" flow.
  it("clears the pdf fields when sent null on update", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    const created = await createTestRequest()
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .send({
        title: "Post To Clear",
        content: "<p>Body.</p>",
        pdfUrl: "https://example.com/full.pdf",
        pdfLabel: "Full version",
      })
      .expect(201);
    const createdBody = created.body as PostPdfResponseBody;
    assert.equal(createdBody.data.pdfUrl, "https://example.com/full.pdf");

    const updated = await createTestRequest()
      .patch(`/api/v1/posts/${createdBody.data.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .send({ pdfUrl: null, pdfLabel: null })
      .expect(200);
    const updatedBody = updated.body as PostPdfResponseBody;

    assert.equal(updatedBody.data.pdfUrl, null);
    assert.equal(updatedBody.data.pdfLabel, null);
  });

  // showFeaturedImage defaults to true so existing posts keep showing the hero.
  it("defaults showFeaturedImage to true when not provided", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    const response = await createTestRequest()
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .send({ title: "Default Hero", content: "<p>Body.</p>" })
      .expect(201);
    const body = response.body as PostShowFeaturedImageResponseBody;

    assert.equal(body.data.showFeaturedImage, true);
  });

  // The admin can opt out per post, and the flag round-trips through update.
  it("stores showFeaturedImage=false and toggles it back on update", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    const created = await createTestRequest()
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .send({
        title: "Hidden Hero",
        content: "<p>Body.</p>",
        showFeaturedImage: false,
      })
      .expect(201);
    const createdBody = created.body as PostShowFeaturedImageResponseBody;
    assert.equal(createdBody.data.showFeaturedImage, false);

    const updated = await createTestRequest()
      .patch(`/api/v1/posts/${createdBody.data.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .send({ showFeaturedImage: true })
      .expect(200);
    const updatedBody = updated.body as PostShowFeaturedImageResponseBody;

    assert.equal(updatedBody.data.showFeaturedImage, true);
  });

  it("rejects a non-boolean showFeaturedImage", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    await createTestRequest()
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .send({
        title: "Bad Flag",
        content: "<p>Body.</p>",
        showFeaturedImage: "yes",
      })
      .expect(400);
  });
});
