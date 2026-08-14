import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import { Post } from "@models/index";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, createPost, loginAdmin } from "../setup/test-helpers";

// 1x1 transparent PNG.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const UPLOADS_DIRECTORY = path.resolve(process.cwd(), "uploads");
const uploadedFileNames = new Set<string>();

interface MediaDto {
  id: string;
  fileName: string;
  url: string;
}

interface MediaListBody {
  success: boolean;
  data: {
    items: MediaDto[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

async function auth(): Promise<{ token: string; adminId: string }> {
  const admin = await createAdmin();
  const login = await loginAdmin(admin);
  return { token: login.accessToken, adminId: admin.admin.id };
}

async function uploadImage(token: string, name = "tiny.png"): Promise<MediaDto> {
  const response = await createTestRequest()
    .post("/api/v1/media/upload")
    .set("Authorization", `Bearer ${token}`)
    .attach("file", TINY_PNG, { filename: name, contentType: "image/png" })
    .expect(201);
  const media = (response.body as { data: MediaDto }).data;
  uploadedFileNames.add(media.fileName);
  return media;
}

async function listMedia(token: string, query = ""): Promise<MediaListBody> {
  const response = await createTestRequest()
    .get(`/api/v1/media${query}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  return response.body as MediaListBody;
}

async function fileExists(fileName: string): Promise<boolean> {
  try {
    await fs.access(path.join(UPLOADS_DIRECTORY, fileName));
    return true;
  } catch {
    return false;
  }
}

describe("media pagination and reference guarding", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    // Uploads land on the real disk, so clean up what these tests wrote.
    await Promise.all(
      [...uploadedFileNames].map((fileName) =>
        fs.rm(path.join(UPLOADS_DIRECTORY, fileName), { force: true }),
      ),
    );
    await teardownIntegrationTests();
  });

  describe("pagination", () => {
    it("returns a bounded page rather than the whole library", async () => {
      const { token } = await auth();
      for (let index = 0; index < 5; index += 1) {
        await uploadImage(token, `tiny-${index}.png`);
      }

      const body = await listMedia(token, "?page=1&limit=2");

      assert.equal(body.data.items.length, 2);
      assert.equal(body.data.pagination.total, 5);
      assert.equal(body.data.pagination.totalPages, 3);
      assert.equal(body.data.pagination.page, 1);
      assert.equal(body.data.pagination.limit, 2);
    });

    it("walks every page without repeating or dropping an item", async () => {
      const { token } = await auth();
      const uploaded = [];
      for (let index = 0; index < 5; index += 1) {
        uploaded.push(await uploadImage(token, `page-${index}.png`));
      }

      const seen: string[] = [];
      for (let page = 1; page <= 3; page += 1) {
        const body = await listMedia(token, `?page=${page}&limit=2`);
        seen.push(...body.data.items.map((item) => item.id));
      }

      assert.equal(seen.length, 5);
      assert.equal(new Set(seen).size, 5);
      assert.deepEqual(
        new Set(seen),
        new Set(uploaded.map((media) => media.id)),
      );
    });

    it("returns an empty page past the end rather than erroring", async () => {
      const { token } = await auth();
      await uploadImage(token);

      const body = await listMedia(token, "?page=99&limit=10");

      assert.equal(body.data.items.length, 0);
      assert.equal(body.data.pagination.total, 1);
    });

    it("reports an empty library as an empty page, not a failure", async () => {
      const { token } = await auth();

      const body = await listMedia(token);

      assert.equal(body.data.items.length, 0);
      assert.equal(body.data.pagination.total, 0);
      assert.equal(body.data.pagination.totalPages, 0);
    });

    it("caps the page size so a caller cannot request the whole library", async () => {
      const { token } = await auth();
      await uploadImage(token);

      const body = await listMedia(token, "?limit=100000");

      assert.ok(
        body.data.pagination.limit <= 100,
        `limit was ${body.data.pagination.limit}`,
      );
    });

    it("falls back to the default page instead of 400-ing on a bad query", async () => {
      const { token } = await auth();
      await uploadImage(token);

      const body = await listMedia(token, "?page=abc&limit=-4");

      assert.equal(body.data.pagination.page, 1);
      assert.ok(body.data.pagination.limit > 0);
    });

    it("still requires authentication", async () => {
      await createTestRequest().get("/api/v1/media?page=1").expect(401);
    });
  });

  describe("deletion reference guard", () => {
    it("refuses to delete an image still used as a featured image", async () => {
      const { token, adminId } = await auth();
      const media = await uploadImage(token);
      const post = await createPost({ adminId });
      post.featuredImageId = media.id;
      await post.save();

      const response = await createTestRequest()
        .delete(`/api/v1/media/${media.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(409);

      assert.match(
        (response.body as { message: string }).message,
        /still used by/i,
      );
      // Crucially, the bytes are still there.
      assert.equal(await fileExists(media.fileName), true);
    });

    it("refuses to delete an image embedded inline in a post body", async () => {
      // Inline images are NOT tracked by a foreign key — the editor writes the
      // URL straight into the post HTML. Without a content check, deleting one
      // silently leaves a broken image in a published article.
      const { token, adminId } = await auth();
      const media = await uploadImage(token);
      await createPost({
        adminId,
        content: `<p>Before</p><img src="${media.url}" alt="Figure 1" /><p>After</p>`,
      });

      await createTestRequest()
        .delete(`/api/v1/media/${media.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(409);

      assert.equal(await fileExists(media.fileName), true);
    });

    it("names the posts blocking the delete so the admin can act", async () => {
      const { token, adminId } = await auth();
      const media = await uploadImage(token);
      await createPost({
        adminId,
        title: "Nepal Tax Update",
        content: `<img src="${media.url}" alt="chart" />`,
      });

      const response = await createTestRequest()
        .delete(`/api/v1/media/${media.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(409);

      assert.match(
        (response.body as { message: string }).message,
        /Nepal Tax Update/,
      );
    });

    it("deletes an unreferenced image", async () => {
      const { token } = await auth();
      const media = await uploadImage(token);

      await createTestRequest()
        .delete(`/api/v1/media/${media.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      assert.equal(await fileExists(media.fileName), false);
    });

    it("allows the delete once the reference is removed", async () => {
      const { token, adminId } = await auth();
      const media = await uploadImage(token);
      const post = await createPost({ adminId });
      post.featuredImageId = media.id;
      await post.save();

      await createTestRequest()
        .delete(`/api/v1/media/${media.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(409);

      post.featuredImageId = null;
      await post.save();

      await createTestRequest()
        .delete(`/api/v1/media/${media.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);
    });

    it("does not let a soft-deleted post block a cleanup", async () => {
      const { token, adminId } = await auth();
      const media = await uploadImage(token);
      const post = await createPost({
        adminId,
        content: `<img src="${media.url}" alt="x" />`,
      });
      await post.destroy();

      await createTestRequest()
        .delete(`/api/v1/media/${media.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);
    });

    it("keeps the database row when the reference check refuses", async () => {
      const { token, adminId } = await auth();
      const media = await uploadImage(token);
      const post = await createPost({ adminId });
      post.featuredImageId = media.id;
      await post.save();

      await createTestRequest()
        .delete(`/api/v1/media/${media.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(409);

      // Still listed and still fetchable — a refused delete changes nothing.
      const body = await listMedia(token);
      assert.equal(body.data.items.some((item) => item.id === media.id), true);
      await createTestRequest()
        .get(`/api/v1/media/${media.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const persisted = await Post.findByPk(post.id);
      assert.equal(persisted?.featuredImageId, media.id);
    });
  });
});
