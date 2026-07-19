import path from "path";
import { randomUUID } from "crypto";
import {
  BadRequestError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from "./media.errors";

export const MAX_MEDIA_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
export type AllowedDocumentMimeType =
  (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];
export type AllowedMimeType = AllowedImageMimeType | AllowedDocumentMimeType;

// High-level classification returned in the media response so the frontend
// library can filter (image vs document) without re-parsing MIME strings.
export type MediaKind = "image" | "document";

const MIME_EXTENSION_MAP: Record<AllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORED_FILE_NAME_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/i;

export interface UploadMediaDto {
  fileName: string;
  originalName: string;
  mimeType: AllowedMimeType;
  size: number;
  buffer: Buffer;
}

export interface MediaIdParamDto {
  id: string;
}

export interface MediaUploadRequestShape {
  mediaUploadFile?: UploadMediaDto;
}

export function isImageMimeType(
  mimeType: string,
): mimeType is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as AllowedImageMimeType);
}

export function isDocumentMimeType(
  mimeType: string,
): mimeType is AllowedDocumentMimeType {
  return ALLOWED_DOCUMENT_MIME_TYPES.includes(
    mimeType as AllowedDocumentMimeType,
  );
}

export function isAllowedMimeType(
  mimeType: string,
): mimeType is AllowedMimeType {
  return isImageMimeType(mimeType) || isDocumentMimeType(mimeType);
}

export function resolveMediaKind(mimeType: string): MediaKind {
  return isDocumentMimeType(mimeType) ? "document" : "image";
}

// Images and documents have different size ceilings (5MB vs 20MB); the check
// that enforces them shares this helper with the response-time DTO assertion.
export function maxUploadSizeForMimeType(mimeType: AllowedMimeType): number {
  return isDocumentMimeType(mimeType)
    ? MAX_DOCUMENT_UPLOAD_SIZE_BYTES
    : MAX_MEDIA_UPLOAD_SIZE_BYTES;
}

export function assertAllowedImageMimeType(
  mimeType: string,
): asserts mimeType is AllowedImageMimeType {
  if (!isImageMimeType(mimeType)) {
    throw new UnsupportedMediaTypeError(
      "Only JPEG, PNG, and WEBP image uploads are allowed.",
    );
  }
}

export function assertAllowedMimeType(
  mimeType: string,
): asserts mimeType is AllowedMimeType {
  if (!isAllowedMimeType(mimeType)) {
    throw new UnsupportedMediaTypeError(
      "Only JPEG, PNG, and WEBP images and PDF documents are allowed.",
    );
  }
}

export function buildStoredFileName(mimeType: AllowedMimeType): string {
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
  assertAllowedMimeType(dto.mimeType);

  if (!dto.originalName || typeof dto.originalName !== "string") {
    throw new BadRequestError("Original file name is required.");
  }

  if (dto.size <= 0) {
    throw new BadRequestError("Uploaded file is empty.");
  }

  const maxSize = maxUploadSizeForMimeType(dto.mimeType);
  if (dto.size > maxSize) {
    throw new PayloadTooLargeError(
      `Invalid file size. Max allowed size is ${maxSize} bytes.`,
    );
  }

  if (!Buffer.isBuffer(dto.buffer) || dto.buffer.length !== dto.size) {
    throw new BadRequestError("Uploaded file buffer is invalid.");
  }
}
