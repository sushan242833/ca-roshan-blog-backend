import { Request, Response, NextFunction } from "express";
import { EmptyRequestParams } from "@app-types/http.requests";
import { BadRequestError } from "@errors/http-error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateContactForm(
  req: Request<EmptyRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  if (!isRecord(body)) return next(new BadRequestError("Invalid request body."));

  const { name, email, subject, message } = body;

  if (!name || typeof name !== "string" || !name.trim())
    return next(new BadRequestError("name is required."));
  if (name.trim().length > 100)
    return next(new BadRequestError("name must be 100 characters or fewer."));

  if (!email || typeof email !== "string" || !email.trim())
    return next(new BadRequestError("email is required."));
  if (!EMAIL_REGEX.test(email.trim()))
    return next(new BadRequestError("email must be a valid email address."));

  if (typeof subject !== "undefined" && subject !== null) {
    if (typeof subject !== "string")
      return next(new BadRequestError("subject must be a string."));
    if (subject.length > 200)
      return next(new BadRequestError("subject must be 200 characters or fewer."));
  }

  if (!message || typeof message !== "string" || !message.trim())
    return next(new BadRequestError("message is required."));
  if (message.trim().length > 5000)
    return next(new BadRequestError("message must be 5000 characters or fewer."));

  return next();
}
