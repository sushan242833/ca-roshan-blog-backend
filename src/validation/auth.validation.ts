import { Request, Response, NextFunction } from "express";
import { EmptyRequestParams } from "@app-types/http.requests";
import { BadRequestError } from "@errors/http-error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateLogin(
  req: Request<EmptyRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const errors: string[] = [];
  const email = isRecord(body) ? body.email : undefined;
  const password = isRecord(body) ? body.password : undefined;

  if (!email || typeof email !== "string") errors.push("email is required");
  if (!password || typeof password !== "string")
    errors.push("password is required");
  if (errors.length) {
    return next(new BadRequestError("email and password are required."));
  }
  return next();
}

function validateOptionalString(
  value: unknown,
  field: string,
  maxLength?: number,
): string | null {
  if (typeof value === "undefined" || value === null) return null;
  if (typeof value !== "string") return `${field} must be a string.`;
  if (typeof maxLength === "number" && value.length > maxLength) {
    return `${field} must be ${maxLength} characters or fewer.`;
  }
  return null;
}

function validateExpertise(value: unknown): string | null {
  if (typeof value === "undefined" || value === null) return null;
  if (typeof value !== "string") return "expertise must be a string.";

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return "expertise must be a valid JSON array string.";
    }
  } catch {
    return "expertise must be a valid JSON array string.";
  }
  return null;
}

export function validateUpdateProfile(
  req: Request<EmptyRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  if (typeof body !== "object" || body === null)
    return next(new BadRequestError("Request body is required."));

  const {
    title,
    bio,
    avatarUrl,
    location,
    yearsOfExperience,
    qualification,
    bioParagraph2,
    professionalQuote,
    expertise,
    closingMessage,
    seoTitle,
    seoDescription,
    ogImageUrl,
  } = body as Record<string, unknown>;

  const stringFieldErrors = [
    validateOptionalString(title, "title", 150),
    validateOptionalString(bio, "bio"),
    validateOptionalString(avatarUrl, "avatarUrl", 500),
    validateOptionalString(location, "location", 200),
    validateOptionalString(yearsOfExperience, "yearsOfExperience", 100),
    validateOptionalString(qualification, "qualification", 300),
    validateOptionalString(bioParagraph2, "bioParagraph2"),
    validateOptionalString(professionalQuote, "professionalQuote"),
    validateOptionalString(closingMessage, "closingMessage"),
    validateOptionalString(seoTitle, "seoTitle", 60),
    validateOptionalString(seoDescription, "seoDescription", 160),
    validateOptionalString(ogImageUrl, "ogImageUrl", 500),
    validateExpertise(expertise),
  ].filter((error): error is string => error !== null);

  if (stringFieldErrors.length > 0) {
    return next(new BadRequestError(stringFieldErrors[0]));
  }

  return next();
}

export default { validateLogin };
