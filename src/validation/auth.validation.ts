import { Request, Response, NextFunction } from "express";
import { EmptyRequestParams } from "@app-types/http.requests";

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
    return next({ status: 400, message: "Validation failed", details: errors });
  }
  return next();
}

export default { validateLogin };
