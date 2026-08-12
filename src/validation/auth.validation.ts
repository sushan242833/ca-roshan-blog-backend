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

const MIN_PASSWORD_LENGTH = 12;

export function validateChangePassword(
  req: Request<EmptyRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const currentPassword = isRecord(body) ? body.currentPassword : undefined;
  const newPassword = isRecord(body) ? body.newPassword : undefined;

  if (!currentPassword || typeof currentPassword !== "string") {
    return next(new BadRequestError("currentPassword is required."));
  }

  if (!newPassword || typeof newPassword !== "string") {
    return next(new BadRequestError("newPassword is required."));
  }

  // Mirrors the service-side check in auth.service.ts, which stays as the
  // authoritative one — this only turns it into a 400 before the bcrypt
  // comparison runs.
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return next(
      new BadRequestError(
        `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      ),
    );
  }

  return next();
}

export default { validateLogin, validateChangePassword };
