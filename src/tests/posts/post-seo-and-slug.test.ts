import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Post } from "@models/index";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, loginAdmin } from "../setup/test-helpers";

interface CreatedPostBody {
  success: boolean;
  data: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
  };
}

interface ValidationErrorBody {
  success: boolean;
  error?: { details?: { field: string; message: string }[] };
}

const MAX_META_TITLE = 60;
const MAX_META_DESCRIPTION = 160;

async function auth(): Promise<string> {
  const admin = await createAdmin();
  const login = await loginAdmin(admin);
  return login.accessToken;
}

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "A perfectly ordinary title",
    content: "<p>Body copy for the article.</p>",
    ...overrides,
  };
}

async function postArticle(
  token: string,
  overrides: Record<string, unknown> = {},
  expectStatus = 201,
) {
  return createTestRequest()
    .post("/api/v1/posts")
    .set("Authorization", `Bearer ${token}`)
    .send(createPayload(overrides))
    .expect(expectStatus);
}

describe("post SEO and slug behaviour", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  // P1-1. The editor sends an empty metaTitle, the service fell back to the full
  // article title, and then validated that fallback against the 60-character SEO
  // limit — so an ordinary long headline could not be saved at all. The article
  // title and the SEO title are separate concepts: the title is bounded only by
  // its column, the derived SEO value is truncated to fit.
  describe("post SEO metadata", () => {
    it("saves a short title and derives an untruncated metaTitle", async () => {
      const token = await auth();
      const title = "Short enough title";

      const body = (await postArticle(token, { title })).body as CreatedPostBody;

      assert.equal(body.data.title, title);
      assert.equal(body.data.metaTitle, title);
    });

    it("saves a title longer than 60 characters and truncates only the metaTitle", async () => {
      const token = await auth();
      const title =
        "Understanding the Nepal Income Tax Act 2058 and its amendments for the fiscal year 2082/83";
      assert.ok(title.length > MAX_META_TITLE);

      const body = (await postArticle(token, { title })).body as CreatedPostBody;

      // The article keeps its real title...
      assert.equal(body.data.title, title);
      // ...while the SEO title is cut to fit.
      assert.ok(
        (body.data.metaTitle ?? "").length <= MAX_META_TITLE,
        `metaTitle was ${(body.data.metaTitle ?? "").length} characters`,
      );
      assert.ok(body.data.metaTitle?.endsWith("…"));
      assert.ok(title.startsWith((body.data.metaTitle ?? "").replace(/…$/, "")));
    });

    it("rejects a title longer than the column with a 400, not a 500", async () => {
      const token = await auth();

      const response = await postArticle(token, { title: "क".repeat(300) }, 400);
      const body = response.body as ValidationErrorBody;

      assert.equal(body.success, false);
      assert.ok(
        body.error?.details?.some((detail) => detail.field === "title"),
        "expected a validation error naming the title field",
      );
    });

    it("derives metaDescription from a short excerpt unchanged", async () => {
      const token = await auth();
      const excerpt = "A brief summary of the article.";

      const body = (await postArticle(token, { excerpt }))
        .body as CreatedPostBody;

      assert.equal(body.data.excerpt, excerpt);
      assert.equal(body.data.metaDescription, excerpt);
    });

    it("saves an excerpt longer than 160 characters and truncates only the metaDescription", async () => {
      const token = await auth();
      const excerpt = `${"An unusually detailed summary of the article. ".repeat(6)}End.`;
      assert.ok(excerpt.length > MAX_META_DESCRIPTION);

      const body = (await postArticle(token, { excerpt }))
        .body as CreatedPostBody;

      assert.equal(body.data.excerpt, excerpt);
      assert.ok(
        (body.data.metaDescription ?? "").length <= MAX_META_DESCRIPTION,
        `metaDescription was ${(body.data.metaDescription ?? "").length} characters`,
      );
      assert.ok(body.data.metaDescription?.endsWith("…"));
    });

    it("accepts an explicit metaTitle within the limit", async () => {
      const token = await auth();
      const metaTitle = "Nepal Income Tax Act 2058: a practical guide";

      const body = (
        await postArticle(token, {
          title:
            "Understanding the Nepal Income Tax Act 2058 and its amendments for 2082/83",
          metaTitle,
        })
      ).body as CreatedPostBody;

      assert.equal(body.data.metaTitle, metaTitle);
    });

    it("still rejects an explicit metaTitle over the limit", async () => {
      const token = await auth();

      const response = await postArticle(
        token,
        { metaTitle: "x".repeat(MAX_META_TITLE + 1) },
        400,
      );
      const body = response.body as ValidationErrorBody;

      assert.ok(
        body.error?.details?.some((detail) => detail.field === "metaTitle"),
        "expected a validation error naming metaTitle",
      );
    });

    it("accepts an explicit metaDescription within the limit", async () => {
      const token = await auth();
      const metaDescription = "A practical walkthrough of the 2058 Act.";

      const body = (await postArticle(token, { metaDescription }))
        .body as CreatedPostBody;

      assert.equal(body.data.metaDescription, metaDescription);
    });

    it("still rejects an explicit metaDescription over the limit", async () => {
      const token = await auth();

      const response = await postArticle(
        token,
        { metaDescription: "x".repeat(MAX_META_DESCRIPTION + 1) },
        400,
      );
      const body = response.body as ValidationErrorBody;

      assert.ok(
        body.error?.details?.some((detail) => detail.field === "metaDescription"),
        "expected a validation error naming metaDescription",
      );
    });

    it("treats an empty metaTitle from the editor as 'derive it for me'", async () => {
      const token = await auth();
      const title =
        "Understanding the Nepal Income Tax Act 2058 and its amendments for the fiscal year 2082/83";

      // This is exactly what the post editor submits for an untouched SEO field,
      // and is the payload that used to fail with a 400.
      const body = (await postArticle(token, { title, metaTitle: "" }))
        .body as CreatedPostBody;

      assert.equal(body.data.title, title);
      assert.ok((body.data.metaTitle ?? "").length <= MAX_META_TITLE);
    });

    it("treats an empty metaDescription as 'derive it for me'", async () => {
      const token = await auth();
      const excerpt = `${"An unusually detailed summary of the article. ".repeat(6)}End.`;

      const body = (await postArticle(token, { excerpt, metaDescription: "" }))
        .body as CreatedPostBody;

      assert.ok((body.data.metaDescription ?? "").length <= MAX_META_DESCRIPTION);
      assert.ok((body.data.metaDescription ?? "").length > 0);
    });

    it("updates a post to a long title without being forced to supply a metaTitle", async () => {
      const token = await auth();
      const created = (await postArticle(token)).body as CreatedPostBody;
      const longTitle =
        "Understanding the Nepal Income Tax Act 2058 and its amendments for the fiscal year 2082/83";

      const response = await createTestRequest()
        .patch(`/api/v1/posts/${created.data.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: longTitle })
        .expect(200);
      const body = response.body as CreatedPostBody;

      assert.equal(body.data.title, longTitle);
      assert.ok((body.data.metaTitle ?? "").length <= MAX_META_TITLE);
    });

    it("leaves an author-supplied metaTitle alone when the article title changes", async () => {
      const token = await auth();
      const metaTitle = "Author's own SEO title";
      const created = (await postArticle(token, { metaTitle }))
        .body as CreatedPostBody;

      const response = await createTestRequest()
        .patch(`/api/v1/posts/${created.data.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "A completely different article title" })
        .expect(200);
      const body = response.body as CreatedPostBody;

      assert.equal(body.data.metaTitle, metaTitle);
    });
  });

  // P1-2. The old slug algorithm stripped every non-ASCII character, so a
  // Devanagari title produced "" and the URLs /blogs/ and /blogs/-2.
  describe("post slug generation", () => {
    it("generates an ASCII slug from an English title", async () => {
      const token = await auth();

      const body = (await postArticle(token, { title: "Hello World" }))
        .body as CreatedPostBody;

      assert.equal(body.data.slug, "hello-world");
    });

    it("generates a Devanagari slug from a Nepali title", async () => {
      const token = await auth();

      const body = (await postArticle(token, { title: "नेपाली कर कानून" }))
        .body as CreatedPostBody;

      assert.equal(body.data.slug, "नेपाली-कर-कानून");
    });

    it("generates a usable slug from a mixed-language title", async () => {
      const token = await auth();

      const body = (await postArticle(token, { title: "नेपाल Tax Law" }))
        .body as CreatedPostBody;

      assert.equal(body.data.slug, "नेपाल-tax-law");
    });

    it("never stores an empty slug, even for a punctuation-only title", async () => {
      const token = await auth();

      const body = (await postArticle(token, { title: "!!!@@@" }))
        .body as CreatedPostBody;

      assert.notEqual(body.data.slug, "");
      assert.equal(body.data.slug, "post");
    });

    it("keeps a digits-only title as its own slug", async () => {
      const token = await auth();

      const body = (await postArticle(token, { title: "123" }))
        .body as CreatedPostBody;

      assert.equal(body.data.slug, "123");
    });

    it("makes duplicate Nepali titles unique instead of colliding on the empty slug", async () => {
      const token = await auth();
      const title = "नेपाली कर कानून";

      const first = (await postArticle(token, { title })).body as CreatedPostBody;
      const second = (await postArticle(token, { title }))
        .body as CreatedPostBody;
      const third = (await postArticle(token, { title })).body as CreatedPostBody;

      assert.equal(first.data.slug, "नेपाली-कर-कानून");
      assert.equal(second.data.slug, "नेपाली-कर-कानून-2");
      assert.equal(third.data.slug, "नेपाली-कर-कानून-3");
      assert.equal(
        new Set([first.data.slug, second.data.slug, third.data.slug]).size,
        3,
      );
    });

    it("makes duplicate punctuation-only titles unique rather than producing / and /-2", async () => {
      const token = await auth();

      const first = (await postArticle(token, { title: "!!!" }))
        .body as CreatedPostBody;
      const second = (await postArticle(token, { title: "???" }))
        .body as CreatedPostBody;

      assert.equal(first.data.slug, "post");
      assert.equal(second.data.slug, "post-2");
    });

    it("resolves a Nepali slug back to the post over the public API", async () => {
      const token = await auth();
      const created = (
        await postArticle(token, {
          title: "नेपाली कर कानून",
          status: "PUBLISHED",
        })
      ).body as CreatedPostBody;

      // Proves the generated URL actually resolves — Express decodes the
      // percent-encoded path segment back to the stored Devanagari slug.
      const response = await createTestRequest()
        .get(`/api/v1/posts/${encodeURIComponent(created.data.slug)}`)
        .expect(200);
      const body = response.body as CreatedPostBody;

      assert.equal(body.data.id, created.data.id);
      assert.equal(body.data.slug, "नेपाली-कर-कानून");
    });

    it("rejects an empty slug at the database level", async () => {
      const token = await auth();
      const created = (await postArticle(token)).body as CreatedPostBody;

      // Bypasses the service entirely: the CHECK constraint from migration 029 is
      // the guarantee that survives a direct write or a data import.
      await assert.rejects(
        () =>
          Post.update(
            { slug: "" },
            { where: { id: created.data.id }, validate: false },
          ),
        /posts_slug_not_empty|violates check constraint/i,
      );
    });
  });

  // The same slugify backs categories and tags, so the same failure existed
  // there: a Nepali category name produced an empty slug and the second one
  // collided with a 409.
  describe("taxonomy slug generation", () => {
    for (const entity of ["categories", "tags"] as const) {
      it(`generates a Devanagari slug for a Nepali ${entity} name`, async () => {
        const token = await auth();

        const response = await createTestRequest()
          .post(`/api/v1/${entity}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ name: "कर कानून" })
          .expect(201);
        const body = response.body as { data: { slug: string } };

        assert.equal(body.data.slug, "कर-कानून");
      });

      it(`gives two punctuation-only ${entity} names distinct slugs`, async () => {
        const token = await auth();

        const first = await createTestRequest()
          .post(`/api/v1/${entity}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ name: "!!!" })
          .expect(201);
        const second = await createTestRequest()
          .post(`/api/v1/${entity}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ name: "???" })
          .expect(201);

        const firstSlug = (first.body as { data: { slug: string } }).data.slug;
        const secondSlug = (second.body as { data: { slug: string } }).data.slug;

        assert.notEqual(firstSlug, "");
        assert.notEqual(secondSlug, "");
        assert.notEqual(firstSlug, secondSlug);
      });
    }
  });
});
