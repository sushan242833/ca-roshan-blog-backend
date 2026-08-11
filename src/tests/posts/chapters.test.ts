import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import sequelize from "@config/config";
import { Post, PostChapter } from "@models/index";
import { PostStatus } from "@models/post.model";
import {
  PAGINATION_BYTE_THRESHOLD,
  regeneratePostChapters,
} from "@services/post-chapter.service";
import { PostService } from "@services/post.service";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, createPost } from "../setup/test-helpers";

interface ChapterSummaryBody {
  id: string;
  title: string;
  order: number;
  excerpt: string | null;
}

interface ChapterIndexResponseBody {
  success: boolean;
  data: {
    id: string;
    paginated: boolean;
    totalChapters: number;
    chapters: ChapterSummaryBody[];
    content: string | null;
  };
}

interface ChapterDetailResponseBody {
  success: boolean;
  data: {
    id: string;
    totalChapters: number;
    chapter: ChapterSummaryBody & { html: string };
    prev: ChapterSummaryBody | null;
    next: ChapterSummaryBody | null;
  };
}

const CHAPTER_TITLES = ["Opening Moves", "The Middle Game", "Endgame Theory"];

// A body just over the pagination threshold, split by paragraph-class headings
// (the form the editor emits). Starting on a heading means no intro chapter, so
// the chapter count equals CHAPTER_TITLES.length exactly.
function buildPaginatedContent(titles: string[] = CHAPTER_TITLES): string {
  // Comfortably past the threshold rather than exactly on it, so the test does
  // not hinge on the byte cost of the surrounding markup.
  const fillerPerChapter = Math.ceil(
    (PAGINATION_BYTE_THRESHOLD + 100_000) / titles.length,
  );

  return titles.map(
    (title, index) =>
      `<p class="heading-2">${title}</p>` +
      `<p>Body of chapter ${index + 1}. ` +
      "lorem ipsum dolor sit amet ".repeat(Math.ceil(fillerPerChapter / 27)) +
      "</p>",
  ).join("");
}

// Rebuilds the persisted split for a post created directly through the model
// helper (which bypasses the service, and therefore the regeneration hook).
async function generateChapters(post: Post): Promise<void> {
  await sequelize.transaction((transaction) =>
    regeneratePostChapters(post, transaction),
  );
}

// `admins` is a singleton table, so createAdmin() may only be called once per
// test. Tests that need several posts create the admin themselves and pass its
// id in; the rest let this create the one admin.
async function createPaginatedPost(
  overrides: { status?: PostStatus; slug?: string; adminId?: string } = {},
): Promise<Post> {
  const adminId = overrides.adminId ?? (await createAdmin()).admin.id;
  const post = await createPost({
    adminId,
    status: overrides.status ?? PostStatus.PUBLISHED,
    slug: overrides.slug,
    content: buildPaginatedContent(),
  });

  await generateChapters(post);
  await post.reload();
  return post;
}

// Records every statement Sequelize issues while `run` is awaited. Sequelize
// resolves `logging` per query from sequelize.options, so swapping it here
// captures the SQL of anything the request under test executes.
async function captureSql(run: () => Promise<void>): Promise<string[]> {
  const captured: string[] = [];
  const previousLogging = sequelize.options.logging;

  sequelize.options.logging = (sql: string) => {
    captured.push(sql);
  };

  try {
    await run();
  } finally {
    sequelize.options.logging = previousLogging;
  }

  return captured;
}

function statementsSelectingContent(statements: string[]): string[] {
  return statements.filter((sql) => /"content"/.test(sql));
}

interface ChapterManifestBody {
  success: boolean;
  data: { slug: string; chapterIds: string[] }[];
}

function findEntry(body: ChapterManifestBody, slug: string) {
  return body.data.find((entry) => entry.slug === slug);
}

async function fetchManifest(): Promise<ChapterManifestBody> {
  const response = await createTestRequest()
    .get("/api/v1/posts/chapter-manifest")
    .expect(200);
  return response.body as ChapterManifestBody;
}

describe("post chapters", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("splits a post over the threshold and stores one row per chapter", async () => {
    const post = await createPaginatedPost();

    assert.equal(post.paginated, true);
    assert.equal(post.chapterCount, CHAPTER_TITLES.length);

    const rows = await PostChapter.findAll({
      where: { postId: post.id },
      order: [["order", "ASC"]],
    });
    assert.deepEqual(
      rows.map((row) => row.title),
      CHAPTER_TITLES,
    );
    assert.deepEqual(
      rows.map((row) => row.order),
      [0, 1, 2],
    );
  });

  // The whole point of the table: neither chapter endpoint may read the body.
  it("serves the chapter index without reading posts.content", async () => {
    const post = await createPaginatedPost();

    let body: ChapterIndexResponseBody | undefined;
    const statements = await captureSql(async () => {
      const response = await createTestRequest()
        .get(`/api/v1/posts/${post.slug}/chapters`)
        .expect(200);
      body = response.body as ChapterIndexResponseBody;
    });

    assert.deepEqual(
      statementsSelectingContent(statements),
      [],
      "the chapter index must not select posts.content",
    );
    assert.ok(
      !statements.some((sql) => /"html"/.test(sql)),
      "the chapter index must not select any chapter html",
    );
    assert.equal(body?.data.paginated, true);
    assert.equal(body?.data.content, null);
    assert.equal(body?.data.totalChapters, CHAPTER_TITLES.length);
    assert.deepEqual(
      body?.data.chapters.map((chapter) => chapter.title),
      CHAPTER_TITLES,
    );
  });

  it("serves one chapter without reading posts.content", async () => {
    const post = await createPaginatedPost();
    const rows = await PostChapter.findAll({
      where: { postId: post.id },
      order: [["order", "ASC"]],
    });

    let body: ChapterDetailResponseBody | undefined;
    const statements = await captureSql(async () => {
      const response = await createTestRequest()
        .get(`/api/v1/posts/${post.slug}/chapters/${rows[1].chapterId}`)
        .expect(200);
      body = response.body as ChapterDetailResponseBody;
    });

    assert.deepEqual(
      statementsSelectingContent(statements),
      [],
      "a chapter read must not select posts.content",
    );
    assert.equal(body?.data.chapter.id, rows[1].chapterId);
    assert.equal(body?.data.chapter.title, CHAPTER_TITLES[1]);
    assert.ok(
      body?.data.chapter.html.includes("Body of chapter 2."),
      "the served chapter should carry its own slice of the body",
    );
    assert.ok(
      !body?.data.chapter.html.includes("Body of chapter 3."),
      "a chapter must not carry the next chapter's body",
    );
  });

  it("returns the correct prev and next references for each chapter", async () => {
    const post = await createPaginatedPost();
    const rows = await PostChapter.findAll({
      where: { postId: post.id },
      order: [["order", "ASC"]],
    });

    const readChapter = async (chapterId: string) => {
      const response = await createTestRequest()
        .get(`/api/v1/posts/${post.slug}/chapters/${chapterId}`)
        .expect(200);
      return (response.body as ChapterDetailResponseBody).data;
    };

    const first = await readChapter(rows[0].chapterId);
    assert.equal(first.prev, null, "the first chapter has no previous");
    assert.equal(first.next?.id, rows[1].chapterId);

    const middle = await readChapter(rows[1].chapterId);
    assert.equal(middle.prev?.id, rows[0].chapterId);
    assert.equal(middle.next?.id, rows[2].chapterId);
    assert.equal(middle.totalChapters, CHAPTER_TITLES.length);

    const last = await readChapter(rows[2].chapterId);
    assert.equal(last.prev?.id, rows[1].chapterId);
    assert.equal(last.next, null, "the last chapter has no next");
  });

  it("returns 404 for a chapter id that does not exist", async () => {
    const post = await createPaginatedPost();

    await createTestRequest()
      .get(`/api/v1/posts/${post.slug}/chapters/no-such-chapter`)
      .expect(404);
  });

  // Chapter ids appear in URLs, so a regeneration of an unchanged body must
  // reproduce them exactly or every existing link breaks.
  it("keeps chapter ids stable across a regeneration of identical content", async () => {
    const post = await createPaginatedPost();
    const before = (
      await PostChapter.findAll({
        where: { postId: post.id },
        order: [["order", "ASC"]],
      })
    ).map((row) => row.chapterId);

    await generateChapters(post);

    const after = (
      await PostChapter.findAll({
        where: { postId: post.id },
        order: [["order", "ASC"]],
      })
    ).map((row) => row.chapterId);

    assert.deepEqual(after, before);
    assert.equal(before.length, CHAPTER_TITLES.length);
  });

  it("rolls the split back with the caller's transaction", async () => {
    const admin = await createAdmin();
    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      content: buildPaginatedContent(),
    });

    await assert.rejects(
      sequelize.transaction(async (transaction) => {
        await regeneratePostChapters(post, transaction);
        // Stand-in for a later failure in the same post write (a validation
        // error, a newsletter dispatch failure) after the split was generated.
        throw new Error("post write failed after regeneration");
      }),
      /post write failed after regeneration/,
    );

    assert.equal(
      await PostChapter.count({ where: { postId: post.id } }),
      0,
      "chapters must not survive a rolled-back post write",
    );
    await post.reload();
    assert.equal(post.paginated, false, "the post flag must roll back too");
    assert.equal(post.chapterCount, 1);
  });

  // post_chapters.title is VARCHAR(512) and chapter_id is VARCHAR(255). A
  // clause-length heading — ordinary in tax and legal writing — used to overflow
  // both, failing the insert inside the post-save transaction and rolling the
  // whole edit back as an unexplained 500.
  it("stores a post with a heading far longer than the title column", async () => {
    const admin = await createAdmin();
    const longHeading =
      "Provided that where any person referred to in the preceding subsection " +
      "fails to furnish the prescribed particulars within the time allowed ".repeat(
        12,
      );
    assert.ok(
      longHeading.length > 512,
      "the fixture heading must exceed the title column",
    );

    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      content: buildPaginatedContent([
        CHAPTER_TITLES[0],
        CHAPTER_TITLES[1],
        longHeading,
      ]),
    });

    await generateChapters(post);
    await post.reload();
    assert.equal(post.paginated, true);

    const rows = await PostChapter.findAll({
      where: { postId: post.id },
      order: [["order", "ASC"]],
    });
    assert.equal(rows.length, CHAPTER_TITLES.length);

    for (const row of rows) {
      assert.ok(
        row.title.length <= 512,
        `title of ${row.title.length} chars exceeds the column`,
      );
      assert.ok(
        row.chapterId.length <= 255,
        `chapter id of ${row.chapterId.length} chars exceeds the column`,
      );
    }

    // The capped chapter is still reachable under the id that was stored.
    const capped = rows.find((row) => row.title.endsWith("…"));
    assert.ok(capped, "the over-long heading should have been capped");
    await createTestRequest()
      .get(`/api/v1/posts/${post.slug}/chapters/${capped.chapterId}`)
      .expect(200);
  });

  // Two long headings that share a 200-character prefix collapse to the same id
  // base; the uniqueness suffix has to separate them, and the unique index on
  // (post_id, chapter_id) fails the insert if it does not.
  it("keeps ids unique when two long headings share a prefix", async () => {
    const admin = await createAdmin();
    const shared = "Schedule of prescribed rates and thresholds applicable ".repeat(
      6,
    );
    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      content: buildPaginatedContent([
        CHAPTER_TITLES[0],
        `${shared} for resident persons`,
        `${shared} for non resident persons`,
      ]),
    });

    await generateChapters(post);

    const ids = (
      await PostChapter.findAll({ where: { postId: post.id } })
    ).map((row) => row.chapterId);

    assert.equal(new Set(ids).size, ids.length, "chapter ids must stay unique");
    ids.forEach((id) => {
      assert.ok(id.length <= 255, `chapter id of ${id.length} chars is too long`);
      assert.ok(!id.endsWith("-"), `chapter id "${id}" must not end in a separator`);
      assert.ok(!id.includes("--"), `chapter id "${id}" must not double separators`);
    });
  });

  // Regression: posts below the threshold behave exactly as before — one page,
  // content inline, and no rows written to post_chapters.
  it("leaves a short post inline with no chapter rows", async () => {
    const admin = await createAdmin();
    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      content:
        '<p class="heading-2">First</p><p>Short.</p>' +
        '<p class="heading-2">Second</p><p>Also short.</p>',
    });
    await generateChapters(post);

    assert.equal(await PostChapter.count({ where: { postId: post.id } }), 0);

    const response = await createTestRequest()
      .get(`/api/v1/posts/${post.slug}/chapters`)
      .expect(200);
    const body = response.body as ChapterIndexResponseBody;

    assert.equal(body.data.paginated, false);
    assert.equal(body.data.totalChapters, 1);
    assert.deepEqual(body.data.chapters, []);
    assert.ok(body.data.content?.includes("Also short."));
  });

  // The manifest exists so the frontend build makes one call instead of one per
  // post. These pin the two things that would silently break that: the route
  // must not be swallowed by GET /:slug, and the rows it lists must be exactly
  // the chapter URLs that resolve.
  it("lists every published paginated post's chapters in order", async () => {
    const post = await createPaginatedPost({ slug: "manifest-ordering" });

    const body = await fetchManifest();
    const entry = findEntry(body, post.slug);

    assert.equal(body.success, true);
    assert.ok(entry, "the published paginated post must appear");

    const rows = await PostChapter.findAll({
      where: { postId: post.id },
      order: [["order", "ASC"]],
    });
    assert.deepEqual(
      entry.chapterIds,
      rows.map((row) => row.chapterId),
      "chapter ids must be ordered by their stored order",
    );
  });

  // "chapter-manifest" is a single path segment, exactly like a slug. If the
  // route were registered after GET /:slug this would 404.
  it("is not captured by the GET /:slug route", async () => {
    await createPaginatedPost();

    const response = await createTestRequest()
      .get("/api/v1/posts/chapter-manifest")
      .expect(200);

    assert.ok(
      Array.isArray((response.body as ChapterManifestBody).data),
      "the manifest must return an array, not a single post",
    );
  });

  it("omits drafts, short posts, and posts with no stored chapters", async () => {
    const adminId = (await createAdmin()).admin.id;

    const published = await createPaginatedPost({
      slug: "manifest-published",
      adminId,
    });
    const draft = await createPaginatedPost({
      slug: "manifest-draft",
      status: PostStatus.DRAFT,
      adminId,
    });

    const short = await createPost({
      adminId,
      slug: "manifest-short",
      status: PostStatus.PUBLISHED,
      content: "<p>Well under the pagination threshold.</p>",
    });

    // paginated = true but the split was never generated (an unrun backfill).
    // getIndex falls back to serving this as a single page, so it has no
    // chapter URLs and must not appear here either.
    const unsplit = await createPaginatedPost({
      slug: "manifest-unsplit",
      adminId,
    });
    await PostChapter.destroy({ where: { postId: unsplit.id } });

    const body = await fetchManifest();

    assert.ok(findEntry(body, published.slug), "published post must appear");
    assert.equal(findEntry(body, draft.slug), undefined, "draft must not appear");
    assert.equal(
      findEntry(body, short.slug),
      undefined,
      "non-paginated post must not appear",
    );
    assert.equal(
      findEntry(body, unsplit.slug),
      undefined,
      "paginated post with no chapter rows must not appear",
    );
  });

  it("builds the manifest without reading content or html", async () => {
    await createPaginatedPost();

    const statements = await captureSql(async () => {
      await fetchManifest();
    });

    assert.deepEqual(
      statementsSelectingContent(statements),
      [],
      "the manifest must not select posts.content",
    );
    assert.deepEqual(
      statements.filter((sql) => /"html"/.test(sql)),
      [],
      "the manifest must not select post_chapters.html",
    );
  });

  // The acceptance criterion for replacing the build's fan-out: the manifest
  // must yield the same slug/chapter pairs the per-post index calls did.
  it("yields the same slug/chapter pairs as the per-post chapter index", async () => {
    const adminId = (await createAdmin()).admin.id;
    const posts = [
      await createPaginatedPost({ slug: "manifest-parity-a", adminId }),
      await createPaginatedPost({ slug: "manifest-parity-b", adminId }),
    ];

    const fromManifest = (await fetchManifest()).data.flatMap((entry) =>
      entry.chapterIds.map((chapter) => `${entry.slug}/${chapter}`),
    );

    // Exactly what the old generateStaticParams did: list posts, then ask each
    // one's chapter index for its chapter ids.
    const fromIndexCalls: string[] = [];
    for (const post of posts) {
      const response = await createTestRequest()
        .get(`/api/v1/posts/${post.slug}/chapters`)
        .expect(200);
      const index = (response.body as ChapterIndexResponseBody).data;
      if (!index.paginated) continue;
      for (const chapter of index.chapters) {
        fromIndexCalls.push(`${post.slug}/${chapter.id}`);
      }
    }

    assert.deepEqual([...fromManifest].sort(), [...fromIndexCalls].sort());
  });

  // The write path itself: creating a post through the API must persist the
  // split in the same transaction, with no extra call from the caller.
  it("generates the split when a post is created through the service", async () => {
    const admin = await createAdmin();
    const service = new PostService();

    const created = await service.create(admin.admin.id, {
      title: "A Very Long Article",
      content: buildPaginatedContent(),
      status: PostStatus.PUBLISHED,
    });

    const post = await Post.findByPk(created.id);
    assert.equal(post?.paginated, true);
    assert.equal(post?.chapterCount, CHAPTER_TITLES.length);
    assert.equal(
      await PostChapter.count({ where: { postId: created.id } }),
      CHAPTER_TITLES.length,
    );
  });

  // Editing the body must rewrite the split, not leave the old chapters behind.
  it("regenerates the split when content is updated", async () => {
    const admin = await createAdmin();
    const service = new PostService();

    const created = await service.create(admin.admin.id, {
      title: "Long Then Short",
      content: buildPaginatedContent(),
      status: PostStatus.PUBLISHED,
    });
    assert.equal(
      await PostChapter.count({ where: { postId: created.id } }),
      CHAPTER_TITLES.length,
    );

    await service.update(created.id, { content: "<p>Now a short post.</p>" });

    const post = await Post.findByPk(created.id);
    assert.equal(post?.paginated, false);
    assert.equal(post?.chapterCount, 1);
    assert.equal(
      await PostChapter.count({ where: { postId: created.id } }),
      0,
      "shrinking below the threshold must clear the stored chapters",
    );
  });
});
