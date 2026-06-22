import { Request, Response, NextFunction } from "express";
import { EmptyRequestParams, IdRequestParams } from "@app-types/http.requests";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateCreateCategory(
  req: Request<EmptyRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const name = isRecord(body) ? body.name : undefined;
  const errors: string[] = [];
  if (!name || typeof name !== "string") errors.push("name is required");
  if (errors.length)
    return next({ status: 400, message: "Validation failed", details: errors });
  return next();
}

export function validateUpdateCategory(
  req: Request<IdRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const name = isRecord(body) ? body.name : undefined;
  const slug = isRecord(body) ? body.slug : undefined;

  if (name && typeof name !== "string")
    return next({ status: 400, message: "Invalid name" });
  if (slug && typeof slug !== "string")
    return next({ status: 400, message: "Invalid slug" });
  return next();
}

export default { validateCreateCategory, validateUpdateCategory };
