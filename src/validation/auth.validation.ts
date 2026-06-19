import { Request, Response, NextFunction } from "express";

export function validateLogin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { email, password } = req.body ?? {};
  const errors: string[] = [];
  if (!email || typeof email !== "string") errors.push("email is required");
  if (!password || typeof password !== "string")
    errors.push("password is required");
  if (errors.length) {
    return next({ status: 400, message: "Validation failed", details: errors });
  }
  return next();
}

export default { validateLogin };
