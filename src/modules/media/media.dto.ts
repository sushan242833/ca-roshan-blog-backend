import path from "path";
import { randomUUID } from "crypto";
import { BadRequestError, UnsupportedMediaTypeError } from "./media.errors";

export const MAX_MEDIA_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const MIME_EXTENSION_MAP: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORED_FILE_NAME_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export interface UploadMediaDto {
  fileName: string;
  originalName: string;
  mimeType: AllowedImageMimeType;
  size: number;
  buffer: Buffer;
}

export interface MediaIdParamDto {
  id: string;
}

export interface MediaUploadRequestShape {
  mediaUploadFile?: UploadMediaDto;
}

export function assertAllowedImageMimeType(
  mimeType: string,
): asserts mimeType is AllowedImageMimeType {
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as AllowedImageMimeType)
  ) {
    throw new UnsupportedMediaTypeError(
      "Only JPEG, PNG, and WEBP image uploads are allowed.",
    );
  }
}

export function buildStoredFileName(mimeType: AllowedImageMimeType): string {
  const extension = MIME_EXTENSION_MAP[mimeType];
  return `${randomUUID()}.${extension}`;
}

export function sanitizeOriginalFileName(originalName: string): string {
  const basename = path.basename(originalName).trim();
  const sanitized = basename
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 255);

  return sanitized || "file";
}

export function assertStoredFileName(fileName: string): void {
  if (!STORED_FILE_NAME_REGEX.test(fileName)) {
    throw new BadRequestError("Invalid storage file name.");
  }
}

export function toMediaIdParamDto(id: string): MediaIdParamDto {
  if (!UUID_V4_REGEX.test(id)) {
    throw new BadRequestError("Invalid media id format.");
  }
  return { id };
}

export function assertUploadMediaDto(dto: UploadMediaDto): void {
  assertStoredFileName(dto.fileName);
  assertAllowedImageMimeType(dto.mimeType);

  if (!dto.originalName || typeof dto.originalName !== "string") {
    throw new BadRequestError("Original file name is required.");
  }

  if (dto.size <= 0 || dto.size > MAX_MEDIA_UPLOAD_SIZE_BYTES) {
    throw new BadRequestError(
      `Invalid file size. Max allowed size is ${MAX_MEDIA_UPLOAD_SIZE_BYTES} bytes.`,
    );
  }

  if (!Buffer.isBuffer(dto.buffer) || dto.buffer.length !== dto.size) {
    throw new BadRequestError("Uploaded file buffer is invalid.");
  }
}
