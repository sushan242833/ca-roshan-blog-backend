import { NextFunction, Request, Response } from "express";

export interface AppError extends Error {
  status?: number;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = err.status ?? 500;
  const message = err.message ?? "Internal Server Error";
  // In production, avoid leaking stack traces
  const payload: { success: boolean; message: string; details?: unknown } = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === "development") {
    payload.details = { stack: err.stack };
  }

  console.error(err);
  res.status(status).json(payload);
}

export default errorMiddleware;
