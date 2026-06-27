import { Request, Response, NextFunction } from "express";
import { EmptyRequestParams, IdRequestParams } from "@app-types/http.requests";
import { BadRequestError } from "@errors/http-error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateCreateTag(
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
  if (typeof name === "string" && name.length > 100)
    return next(new BadRequestError("name must be 100 characters or fewer."));
  return next();
}

export function validateUpdateTag(
  req: Request<IdRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  const name = isRecord(body) ? body.name : undefined;
  const slug = isRecord(body) ? body.slug : undefined;

  if (name && typeof name !== "string")
    return next({ status: 400, message: "Invalid name" });
  if (typeof name === "string" && name.length > 100)
    return next(new BadRequestError("name must be 100 characters or fewer."));
  if (slug && typeof slug !== "string")
    return next({ status: 400, message: "Invalid slug" });
  return next();
}

export default { validateCreateTag, validateUpdateTag };
