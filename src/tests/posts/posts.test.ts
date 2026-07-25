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

  // Punctuation, wildcard characters and unbalanced quotes are arbitrary user
  // input. escapeRegex neutralises every regex metacharacter, so the request
  // must succeed (200), never 500.
  it("does not error on punctuation, wildcards or an unbalanced quote", async () => {
    const admin = await createAdmin();
    await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "A published article",
      content: "<p>Body.</p>",
    });

    for (const term of ['50% off', 'file_name', '"unbalanced quote', 'a ) & | b']) {
      const response = await createTestRequest()
        .get(`/api/v1/posts?search=${encodeURIComponent(term)}`)
        .expect(200);
      const body = response.body as PostListResponseBody;
      assert.equal(body.success, true, `"${term}" should return 200`);
    }
  });

  // Word-start prefix matching: "test" returns both the exact title "Test" and
  // the prefix title "test10", with the exact whole-word match ranked first.
  it("prefix-matches a title and ranks the exact word first", async () => {
    const admin = await createAdmin();
    const exact = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "Test",
      content: "<p>Body.</p>",
    });
    const prefixed = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "test10",
      content: "<p>Body.</p>",
    });

    const response = await createTestRequest()
      .get("/api/v1/posts?search=test")
      .expect(200);
    const items = (response.body as PostListResponseBody).data.items;
    const ids = items.map((item) => item.id);

    assert.ok(ids.includes(exact.id), '"test" should return "Test"');
    assert.ok(ids.includes(prefixed.id), '"test" should return "test10"');
    assert.ok(
      ids.indexOf(exact.id) < ids.indexOf(prefixed.id),
      'exact word "Test" must rank before prefix "test10"',
    );

    // A more specific prefix narrows to only the longer word.
    const narrowed = await createTestRequest()
      .get("/api/v1/posts?search=test1")
      .expect(200);
    const narrowedIds = (narrowed.body as PostListResponseBody).data.items.map(
      (i) => i.id,
    );
    assert.ok(narrowedIds.includes(prefixed.id), '"test1" should return "test10"');
    assert.ok(!narrowedIds.includes(exact.id), '"test1" must NOT return "Test"');
  });

  // The prefix anchors the START of a word only: "est" is an infix of "test",
  // so it must NOT match, and neither must an unrelated word like "latest".
  it("anchors the word start (est / latest do not match test)", async () => {
    const admin = await createAdmin();
    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "Test",
      content: "<p>A short body.</p>",
    });

    for (const term of ["est", "latest"]) {
      const response = await createTestRequest()
        .get(`/api/v1/posts?search=${term}`)
        .expect(200);
      const ids = (response.body as PostListResponseBody).data.items.map((i) => i.id);
      assert.ok(!ids.includes(post.id), `"${term}" must NOT match the word "test"`);
    }
  });

  // FIX 2: multi-word queries AND the tokens, so a post containing both words
  // separately matches, while a post with only one of them does not.
  it("matches a two-word query against words appearing separately", async () => {
    const admin = await createAdmin();
    const bothPost = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "Filing your annual income return before the tax deadline",
      content: "<p>Body.</p>",
    });
    const onlyOnePost = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "A note on income alone",
      content: "<p>Body.</p>",
    });

    const response = await createTestRequest()
      .get(`/api/v1/posts?search=${encodeURIComponent("income tax")}`)
      .expect(200);
    const body = response.body as PostListResponseBody;
    const ids = body.data.items.map((item) => item.id);

    assert.ok(ids.includes(bothPost.id), "post with both words should match");
    assert.ok(
      !ids.includes(onlyOnePost.id),
      "post missing one token must NOT match (tokens are AND-ed)",
    );
  });

  // FIX 4: a title match outranks a body-only match even when the body match
  // was published more recently.
  it("ranks a title match above a newer body-only match", async () => {
    const admin = await createAdmin();
    const token = "reconciliation";

    const titlePost = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: `Quarterly ${token} explained`,
      content: "<p>No matching term in this body.</p>",
    });
    await titlePost.update({ publishedAt: new Date("2020-01-01T00:00:00Z") });

    const bodyPost = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "An unrelated heading",
      content: `<p>The word ${token} appears only here.</p>`,
    });
    await bodyPost.update({ publishedAt: new Date("2024-01-01T00:00:00Z") });

    const response = await createTestRequest()
      .get(`/api/v1/posts?search=${token}`)
      .expect(200);
    const body = response.body as PostListResponseBody;

    assert.equal(
      body.data.items[0]?.id,
      titlePost.id,
      "title match should rank first despite the body match being newer",
    );
  });

  // FIX 5: with a stable id tiebreaker, paginating posts that share the same
  // published_at returns every post exactly once — no dupes, no gaps.
  it("paginates posts with identical published_at without dupes or gaps", async () => {
    const admin = await createAdmin();
    const sharedTimestamp = new Date("2023-06-15T12:00:00Z");
    const created = [];
    for (let i = 0; i < 3; i += 1) {
      const post = await createPost({
        adminId: admin.admin.id,
        status: PostStatus.PUBLISHED,
        title: `Same-timestamp post ${i}`,
      });
      await post.update({ publishedAt: sharedTimestamp });
      created.push(post.id);
    }

    const seen = new Set<string>();
    for (let page = 1; page <= 3; page += 1) {
      const response = await createTestRequest()
        .get(`/api/v1/posts?limit=1&page=${page}`)
        .expect(200);
      const body = response.body as PostListResponseBody;
      assert.equal(body.data.items.length, 1, `page ${page} should hold one post`);
      seen.add(body.data.items[0].id);
    }

    assert.equal(seen.size, 3, "each post should appear exactly once across pages");
    created.forEach((id) =>
      assert.ok(seen.has(id), `post ${id} should appear on some page`),
    );
  });

  // FIX 3: a single-character search is below the minimum and is treated as
  // absent, returning the unfiltered published list rather than throwing.
  it("ignores a 1-character search and returns the unfiltered list", async () => {
    const admin = await createAdmin();
    const first = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "First published article",
    });
    const second = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "Second published article",
    });

    const response = await createTestRequest()
      .get("/api/v1/posts?search=a")
      .expect(200);
    const body = response.body as PostListResponseBody;
    const ids = body.data.items.map((item) => item.id);

    assert.ok(ids.includes(first.id) && ids.includes(second.id),
      "a 1-char search should not filter the list",
    );
  });

  // FIX 3: an over-long search is truncated, not rejected — 200, never 500.
  it("truncates a 500-character search instead of failing", async () => {
    const admin = await createAdmin();
    await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "Any published post",
    });

    const longTerm = "a".repeat(500);
    const response = await createTestRequest()
      .get(`/api/v1/posts?search=${longTerm}`)
      .expect(200);
    const body = response.body as PostListResponseBody;

    assert.equal(body.success, true);
  });

  // FIX 7: an invalid status enum value is a 400, not a DB-level 500.
  it("rejects an invalid status on admin list with 400", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    await createTestRequest()
      .get("/api/v1/posts/admin/list?status=NOTAREALSTATUS")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(400);
  });

  // FIX 8: empty numeric params are treated as absent, falling back to defaults.
  it("accepts empty page and limit params using defaults", async () => {
    const admin = await createAdmin();
    await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      title: "A published post",
    });

    const response = await createTestRequest()
      .get("/api/v1/posts?page=&limit=")
      .expect(200);
    const body = response.body as PostListResponseBody;

    assert.equal(body.success, true);
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
