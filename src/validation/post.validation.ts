import { Request, Response, NextFunction } from "express";

export function validateCreatePost(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { title, content } = req.body ?? {};
  const errors: string[] = [];
  if (!title || typeof title !== "string") errors.push("title is required");
  if (!content || typeof content !== "string")
    errors.push("content is required");
  if (errors.length)
    return next({ status: 400, message: "Validation failed", details: errors });
  return next();
}

export function validateUpdatePost(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { title, content } = req.body ?? {};
  if (title && typeof title !== "string")
    return next({ status: 400, message: "Invalid title" });
  if (content && typeof content !== "string")
    return next({ status: 400, message: "Invalid content" });
  return next();
}

export default { validateCreatePost, validateUpdatePost };
