import { Request, Response, NextFunction } from "express";

export function validateCreateCategory(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { name } = req.body ?? {};
  const errors: string[] = [];
  if (!name || typeof name !== "string") errors.push("name is required");
  if (errors.length)
    return next({ status: 400, message: "Validation failed", details: errors });
  return next();
}

export function validateUpdateCategory(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { name, slug } = req.body ?? {};
  if (name && typeof name !== "string")
    return next({ status: 400, message: "Invalid name" });
  if (slug && typeof slug !== "string")
    return next({ status: 400, message: "Invalid slug" });
  return next();
}

export default { validateCreateCategory, validateUpdateCategory };
