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

export function validateUpdateProfile(
  req: Request<EmptyRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  if (typeof body !== "object" || body === null)
    return next(new BadRequestError("Request body is required."));

  const { title, bio, avatarUrl } = body as Record<string, unknown>;

  if (typeof title !== "undefined" && title !== null && typeof title !== "string")
    return next(new BadRequestError("title must be a string."));

  if (typeof title === "string" && (title as string).length > 150)
    return next(new BadRequestError("title must be 150 characters or fewer."));

  if (typeof bio !== "undefined" && bio !== null && typeof bio !== "string")
    return next(new BadRequestError("bio must be a string."));

  if (typeof avatarUrl !== "undefined" && avatarUrl !== null && typeof avatarUrl !== "string")
    return next(new BadRequestError("avatarUrl must be a string."));

  if (typeof avatarUrl === "string" && (avatarUrl as string).length > 500)
    return next(new BadRequestError("avatarUrl must be 500 characters or fewer."));

  return next();
}

export default { validateLogin };
