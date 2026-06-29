import { Request, Response, NextFunction } from "express";
import { ValidationError, ValidationIssue } from "@errors/http-error";
import { PostStatus } from "@models/post.model";
import { EmptyRequestParams, IdRequestParams } from "@app-types/http.requests";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_META_TITLE_LENGTH = 60;
const MAX_META_DESCRIPTION_LENGTH = 160;

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
  validateStatus(body, errors);
  validateSeoLengths(body, errors);

  if (errors.length > 0) {
    return next(new ValidationError(errors));
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

export default { validateCreatePost, validateUpdatePost };
