import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import {
  MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
  MAX_MEDIA_UPLOAD_SIZE_BYTES,
} from "@modules/media/media.dto";
import { PostStatus } from "@models/post.model";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, createPost, loginAdmin } from "../setup/test-helpers";

interface MediaResponseDto {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  kind: string;
  size: number;
  url: string;
  provider: string;
  inUse: boolean;
}

interface MediaResponseBody {
  success: boolean;
  data: MediaResponseDto;
}

interface MediaListResponseBody {
  success: boolean;
  data: MediaResponseDto[];
}

interface MediaUsageResponseBody {
  success: boolean;
  data: {
    inUse: boolean;
    usedByAuthorAvatar: boolean;
    posts: {
      postId: string;
      title: string;
      status: string;
      trashed: boolean;
      usedAs: string[];
    }[];
  };
}

const UPLOADS_DIRECTORY = path.resolve(process.cwd(), "uploads");

// Smallest valid PNG: 1x1 transparent pixel.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// A minimal PDF byte stream. The upload path trusts the multipart content
// type rather than sniffing bytes, so a short valid header is enough.
const TINY_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  "utf8",
);

const uploadedFileNames = new Set<string>();

function uploadedFilePath(fileName: string): string {
  return path.join(UPLOADS_DIRECTORY, fileName);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function uploadTinyPng(accessToken: string): Promise<MediaResponseDto> {
  const response = await createTestRequest()
    .post("/api/v1/media/upload")
    .set("Authorization", `Bearer ${accessToken}`)
    .attach("file", TINY_PNG, { filename: "tiny.png", contentType: "image/png" })
    .expect(201);
  const body = response.body as MediaResponseBody;

  uploadedFileNames.add(body.data.fileName);
  return body.data;
}

async function uploadTinyPdf(accessToken: string): Promise<MediaResponseDto> {
  const response = await createTestRequest()
    .post("/api/v1/media/upload")
    .set("Authorization", `Bearer ${accessToken}`)
    .attach("file", TINY_PDF, {
      filename: "report.pdf",
      contentType: "application/pdf",
    })
    .expect(201);
  const body = response.body as MediaResponseBody;

  uploadedFileNames.add(body.data.fileName);
  return body.data;
}

describe("media", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await Promise.all(
      [...uploadedFileNames].map((fileName) =>
        fs.rm(uploadedFilePath(fileName), { force: true }),
      ),
    );
    await teardownIntegrationTests();
  });

  it("rejects an unauthenticated upload", async () => {
    await createTestRequest()
      .post("/api/v1/media/upload")
      .attach("file", TINY_PNG, { filename: "tiny.png", contentType: "image/png" })
      .expect(401);
  });

  it("uploads a valid png and persists the file to disk", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    const media = await uploadTinyPng(login.accessToken);

    assert.equal(media.mimeType, "image/png");
    assert.equal(media.originalName, "tiny.png");
    assert.equal(media.size, TINY_PNG.length);
    assert.equal(media.provider, "LOCAL");
    assert.ok(media.url.includes(`/uploads/${media.fileName}`));
    assert.equal(await fileExists(uploadedFilePath(media.fileName)), true);
  });

  it("rejects a disallowed MIME type", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    await createTestRequest()
      .post("/api/v1/media/upload")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .attach("file", Buffer.from("not an image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      })
      .expect(415);
  });

  it("rejects an oversized file", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const oversized = Buffer.alloc(MAX_MEDIA_UPLOAD_SIZE_BYTES + 1);

    await createTestRequest()
      .post("/api/v1/media/upload")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .attach("file", oversized, { filename: "huge.png", contentType: "image/png" })
      .expect(413);
  });

  it("lists uploaded media for an authenticated admin", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const media = await uploadTinyPng(login.accessToken);

    const response = await createTestRequest()
      .get("/api/v1/media")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const body = response.body as MediaListResponseBody;

    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, media.id);
  });

  it("rejects an unauthenticated media list", async () => {
    await createTestRequest().get("/api/v1/media").expect(401);
  });

  it("deletes media, removing it from the list and from disk", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const media = await uploadTinyPng(login.accessToken);

    await createTestRequest()
      .delete(`/api/v1/media/${media.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(204);

    const response = await createTestRequest()
      .get("/api/v1/media")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const body = response.body as MediaListResponseBody;

    assert.equal(body.data.length, 0);
    assert.equal(await fileExists(uploadedFilePath(media.fileName)), false);
  });

  it("refuses to delete media set as a post's featured image", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const media = await uploadTinyPng(login.accessToken);
    await createPost({
      adminId: admin.admin.id,
      title: "Featured image post",
      status: PostStatus.PUBLISHED,
      featuredImageId: media.id,
    });

    const response = await createTestRequest()
      .delete(`/api/v1/media/${media.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(409);

    assert.match(
      (response.body as { message: string }).message,
      /Featured image post/,
    );
    // The record and the file both survive a refused delete.
    assert.equal(await fileExists(uploadedFilePath(media.fileName)), true);
    await createTestRequest()
      .get(`/api/v1/media/${media.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
  });

  it("refuses to delete media embedded in the body of a draft post", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const media = await uploadTinyPng(login.accessToken);
    await createPost({
      adminId: admin.admin.id,
      status: PostStatus.DRAFT,
      content: `<p>Intro</p><img src="${media.url}" alt="inline" />`,
    });

    await createTestRequest()
      .delete(`/api/v1/media/${media.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(409);
  });

  it("refuses to delete a pdf linked by an archived post", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const pdf = await uploadTinyPdf(login.accessToken);
    await createPost({
      adminId: admin.admin.id,
      status: PostStatus.ARCHIVED,
      pdfUrl: pdf.url,
    });

    await createTestRequest()
      .delete(`/api/v1/media/${pdf.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(409);
  });

  it("refuses to delete media held by a trashed post, which is restorable", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const media = await uploadTinyPng(login.accessToken);
    const post = await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      featuredImageId: media.id,
    });
    await post.destroy();

    await createTestRequest()
      .delete(`/api/v1/media/${media.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(409);
  });

  it("deletes media once the last post referencing it lets it go", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const media = await uploadTinyPng(login.accessToken);
    const post = await createPost({
      adminId: admin.admin.id,
      featuredImageId: media.id,
    });

    await createTestRequest()
      .delete(`/api/v1/media/${media.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(409);

    await post.update({ featuredImageId: null });

    await createTestRequest()
      .delete(`/api/v1/media/${media.id}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(204);
    assert.equal(await fileExists(uploadedFilePath(media.fileName)), false);
  });

  it("reports where a media item is used", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const used = await uploadTinyPng(login.accessToken);
    const unused = await uploadTinyPng(login.accessToken);
    const post = await createPost({
      adminId: admin.admin.id,
      title: "Usage report post",
      status: PostStatus.PUBLISHED,
      featuredImageId: used.id,
      content: `<p><img src="${used.url}" alt="inline" /></p>`,
    });

    const usedResponse = await createTestRequest()
      .get(`/api/v1/media/${used.id}/usage`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const usage = (usedResponse.body as MediaUsageResponseBody).data;

    assert.equal(usage.inUse, true);
    assert.equal(usage.usedByAuthorAvatar, false);
    assert.equal(usage.posts.length, 1);
    assert.equal(usage.posts[0].postId, post.id);
    assert.equal(usage.posts[0].status, "PUBLISHED");
    assert.equal(usage.posts[0].trashed, false);
    assert.deepEqual(usage.posts[0].usedAs, ["featuredImage"]);

    const unusedResponse = await createTestRequest()
      .get(`/api/v1/media/${unused.id}/usage`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const unusedUsage = (unusedResponse.body as MediaUsageResponseBody).data;

    assert.equal(unusedUsage.inUse, false);
    assert.equal(unusedUsage.posts.length, 0);
  });

  it("flags in-use media in the list so the library can mark it", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const featured = await uploadTinyPng(login.accessToken);
    const inline = await uploadTinyPng(login.accessToken);
    const unused = await uploadTinyPng(login.accessToken);
    await createPost({
      adminId: admin.admin.id,
      status: PostStatus.PUBLISHED,
      featuredImageId: featured.id,
      content: `<p><img src="${inline.url}" alt="inline" /></p>`,
    });

    const response = await createTestRequest()
      .get("/api/v1/media")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const body = response.body as MediaListResponseBody;
    const byId = new Map(body.data.map((item) => [item.id, item]));

    assert.equal(byId.get(featured.id)?.inUse, true);
    assert.equal(byId.get(inline.id)?.inUse, true);
    assert.equal(byId.get(unused.id)?.inUse, false);
  });

  it("reports a freshly uploaded file as unused", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    const media = await uploadTinyPng(login.accessToken);

    assert.equal(media.inUse, false);
  });

  it("rejects an unauthenticated usage lookup", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const media = await uploadTinyPng(login.accessToken);

    await createTestRequest().get(`/api/v1/media/${media.id}/usage`).expect(401);
  });

  it("returns 404 when deleting a random UUID", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    await createTestRequest()
      .delete(`/api/v1/media/${randomUUID()}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(404);
  });

  it("uploads a valid pdf, tags it as a document, and stores a .pdf file", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    const media = await uploadTinyPdf(login.accessToken);

    assert.equal(media.mimeType, "application/pdf");
    assert.equal(media.kind, "document");
    assert.ok(media.fileName.endsWith(".pdf"));
    assert.equal(media.size, TINY_PDF.length);
    assert.equal(await fileExists(uploadedFilePath(media.fileName)), true);
  });

  it("rejects a pdf larger than the document size limit", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const oversized = Buffer.alloc(MAX_DOCUMENT_UPLOAD_SIZE_BYTES + 1);

    await createTestRequest()
      .post("/api/v1/media/upload")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .attach("file", oversized, {
        filename: "huge.pdf",
        contentType: "application/pdf",
      })
      .expect(413);
  });

  it("rejects a disallowed document type (application/zip)", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    await createTestRequest()
      .post("/api/v1/media/upload")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .attach("file", Buffer.from("PK zip bytes"), {
        filename: "archive.zip",
        contentType: "application/zip",
      })
      .expect(415);
  });

  it("filters the media list by kind via ?type=document", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const image = await uploadTinyPng(login.accessToken);
    const pdf = await uploadTinyPdf(login.accessToken);

    const docsResponse = await createTestRequest()
      .get("/api/v1/media?type=document")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const docs = docsResponse.body as MediaListResponseBody;

    assert.equal(docs.data.length, 1);
    assert.equal(docs.data[0].id, pdf.id);
    assert.equal(docs.data[0].kind, "document");

    const imagesResponse = await createTestRequest()
      .get("/api/v1/media?type=image")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const images = imagesResponse.body as MediaListResponseBody;

    assert.equal(images.data.length, 1);
    assert.equal(images.data[0].id, image.id);
    assert.equal(images.data[0].kind, "image");
  });
});
