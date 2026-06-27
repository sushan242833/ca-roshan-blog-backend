import { Request, Response, NextFunction } from "express";
import { EmptyRequestParams, IdRequestParams } from "@app-types/http.requests";
import { BadRequestError } from "@errors/http-error";

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
    return next(new BadRequestError("name is required."));
  if (typeof name === "string" && name.length > 100)
    return next(new BadRequestError("name must be 100 characters or fewer."));
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
    return next(new BadRequestError("Invalid name."));
  if (typeof name === "string" && name.length > 100)
    return next(new BadRequestError("name must be 100 characters or fewer."));
  if (slug && typeof slug !== "string")
    return next(new BadRequestError("Invalid slug."));
  return next();
}

export default { validateCreateCategory, validateUpdateCategory };
