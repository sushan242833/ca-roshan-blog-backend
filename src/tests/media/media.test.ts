import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { MAX_MEDIA_UPLOAD_SIZE_BYTES } from "@modules/media/media.dto";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, loginAdmin } from "../setup/test-helpers";

interface MediaResponseDto {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  provider: string;
}

interface MediaResponseBody {
  success: boolean;
  data: MediaResponseDto;
}

interface MediaListResponseBody {
  success: boolean;
  data: MediaResponseDto[];
}

const UPLOADS_DIRECTORY = path.resolve(process.cwd(), "uploads");

// Smallest valid PNG: 1x1 transparent pixel.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
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

  it("returns 404 when deleting a random UUID", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);

    await createTestRequest()
      .delete(`/api/v1/media/${randomUUID()}`)
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(404);
  });
});
