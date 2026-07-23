import { Request, Response, NextFunction } from "express";
import { NotFoundError, ValidationError, ValidationIssue } from "@errors/http-error";
import { PostStatus } from "@models/post.model";
import { EmptyRequestParams, IdRequestParams } from "@app-types/http.requests";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_META_TITLE_LENGTH = 60;
const MAX_META_DESCRIPTION_LENGTH = 160;
const MAX_PDF_URL_LENGTH = 2048;
const MAX_PDF_LABEL_LENGTH = 255;

// A PDF link is either an absolute http(s) URL (external hosting) or a
// relative path served from our own /uploads/ static route (self-hosted
// media). Anything else — javascript:, data:, other schemes, arbitrary
// paths — is rejected so the value can be rendered as a plain href safely.
function isValidPdfUrl(value: string): boolean {
  if (value.startsWith("/uploads/")) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateRequiredString(
  body: Record<string, unknown>,
  field: string,
  errors: ValidationIssue[],
): void {
  if (typeof body[field] !== "string" || !body[field].trim()) {
    errors.push({ field, message: `${field} is required.` });
  }
}

function validateOptionalString(
  body: Record<string, unknown>,
  field: string,
  errors: ValidationIssue[],
): void {
  const value = body[field];
  if (typeof value === "undefined" || value === null) {
    return;
  }

  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string.` });
  }
}

function validateOptionalBoolean(
  body: Record<string, unknown>,
  field: string,
  errors: ValidationIssue[],
): void {
  const value = body[field];
  if (typeof value !== "undefined" && typeof value !== "boolean") {
    errors.push({ field, message: `${field} must be a boolean.` });
  }
}

function validateOptionalUuid(
  body: Record<string, unknown>,
  field: string,
  errors: ValidationIssue[],
): void {
  const value = body[field];
  if (typeof value === "undefined" || value === null) {
    return;
  }

  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    errors.push({ field, message: `${field} must be a valid UUID.` });
  }
}

function validateOptionalUuidArray(
  body: Record<string, unknown>,
  field: string,
  errors: ValidationIssue[],
): void {
  const value = body[field];
  if (typeof value === "undefined") {
    return;
  }

  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !UUID_REGEX.test(item))
  ) {
    errors.push({ field, message: `${field} must be an array of UUIDs.` });
  }
}

function validateStatus(
  body: Record<string, unknown>,
  errors: ValidationIssue[],
): void {
  const value = body.status;
  if (typeof value === "undefined") {
    return;
  }

  if (
    typeof value !== "string" ||
    !Object.values(PostStatus).includes(value as PostStatus)
  ) {
    errors.push({
      field: "status",
      message: "status must be DRAFT, PUBLISHED, or ARCHIVED.",
    });
  }
}

function validateSeoLengths(
  body: Record<string, unknown>,
  errors: ValidationIssue[],
): void {
  if (
    typeof body.metaTitle === "string" &&
    body.metaTitle.length > MAX_META_TITLE_LENGTH
  ) {
    errors.push({
      field: "metaTitle",
      message: `metaTitle must be ${MAX_META_TITLE_LENGTH} characters or fewer.`,
    });
  }

  if (
    typeof body.metaDescription === "string" &&
    body.metaDescription.length > MAX_META_DESCRIPTION_LENGTH
  ) {
    errors.push({
      field: "metaDescription",
      message: `metaDescription must be ${MAX_META_DESCRIPTION_LENGTH} characters or fewer.`,
    });
  }
}

function validatePdfFields(
  body: Record<string, unknown>,
  errors: ValidationIssue[],
): void {
  const url = body.pdfUrl;
  // undefined = field not sent (leave unchanged); null = explicit clear.
  if (typeof url !== "undefined" && url !== null) {
    if (typeof url !== "string") {
      errors.push({ field: "pdfUrl", message: "pdfUrl must be a string." });
    } else if (url.length > MAX_PDF_URL_LENGTH) {
      errors.push({
        field: "pdfUrl",
        message: `pdfUrl must be ${MAX_PDF_URL_LENGTH} characters or fewer.`,
      });
    } else if (!isValidPdfUrl(url.trim())) {
      errors.push({
        field: "pdfUrl",
        message:
          "pdfUrl must be a valid http(s) URL or a path starting with /uploads/.",
      });
    }
  }

  const label = body.pdfLabel;
  if (typeof label !== "undefined" && label !== null) {
    if (typeof label !== "string") {
      errors.push({ field: "pdfLabel", message: "pdfLabel must be a string." });
    } else if (label.length > MAX_PDF_LABEL_LENGTH) {
      errors.push({
        field: "pdfLabel",
        message: `pdfLabel must be ${MAX_PDF_LABEL_LENGTH} characters or fewer.`,
      });
    }
  }
}

function validatePostBody(
  req: Request<EmptyRequestParams | IdRequestParams, unknown, unknown>,
  requiredFields: string[],
  next: NextFunction,
): void {
  const body = req.body;
  const errors: ValidationIssue[] = [];

  if (!isRecord(body)) {
    return next(
      new ValidationError([{ field: "body", message: "Request body is required." }]),
    );
  }

  requiredFields.forEach((field) => validateRequiredString(body, field, errors));
  [
    "title",
    "content",
    "slug",
    "excerpt",
    "metaTitle",
    "metaDescription",
  ].forEach((field) => validateOptionalString(body, field, errors));
  validateOptionalUuid(body, "featuredImageId", errors);
  validateOptionalUuid(body, "categoryId", errors);
  validateOptionalUuidArray(body, "categoryIds", errors);
  validateOptionalUuidArray(body, "tagIds", errors);
  validateOptionalBoolean(body, "featured", errors);
  validateOptionalBoolean(body, "published", errors);
  validateOptionalBoolean(body, "showFeaturedImage", errors);
  validateStatus(body, errors);
  validateSeoLengths(body, errors);
  validatePdfFields(body, errors);

  if (errors.length > 0) {
    return next(new ValidationError(errors));
  }

  return next();
}

// A malformed id can never match a post, so it is a 404 rather than a 400 —
// this also keeps non-UUID strings away from Postgres, which would otherwise
// throw a cast error inside the repository.
export function validatePostIdParam(
  req: Request<IdRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  if (!UUID_REGEX.test(req.params.id)) {
    return next(new NotFoundError("Post not found."));
  }

  return next();
}

export function validateCreatePost(
  req: Request<EmptyRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  return validatePostBody(req, ["title", "content"], next);
}

export function validateUpdatePost(
  req: Request<IdRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  return validatePostBody(req, [], next);
}

export default { validateCreatePost, validateUpdatePost, validatePostIdParam };
