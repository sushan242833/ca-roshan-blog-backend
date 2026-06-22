import { NextFunction, Request, Response } from "express";
import { ValidationError, ValidationIssue } from "@errors/http-error";
import {
  EmptyRequestParams,
  VerifySubscriberRequest,
} from "@app-types/http.requests";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_REGEX = /^[a-zA-Z0-9_-]{32,255}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateCreateSubscriber(
  req: Request<EmptyRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const errors: ValidationIssue[] = [];

  if (!isRecord(body)) {
    return next(
      new ValidationError([{ field: "body", message: "Request body is required." }]),
    );
  }

  if (typeof body.email !== "string" || !EMAIL_REGEX.test(body.email.trim())) {
    errors.push({
      field: "email",
      message: "email must be a valid email address.",
    });
  } else if (body.email.trim().length > 320) {
    errors.push({
      field: "email",
      message: "email must be 320 characters or fewer.",
    });
  }

  if (errors.length > 0) {
    return next(new ValidationError(errors));
  }

  return next();
}

export function validateSubscriberToken(
  req: Request<VerifySubscriberRequest, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const token = req.params.token;

  if (typeof token !== "string" || !TOKEN_REGEX.test(token)) {
    return next(
      new ValidationError([
        { field: "token", message: "token must be a valid subscriber token." },
      ]),
    );
  }

  return next();
}

export default {
  validateCreateSubscriber,
  validateSubscriberToken,
};
