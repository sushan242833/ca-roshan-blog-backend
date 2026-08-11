import { NextFunction, Request, Response } from "express";
import { EmptyRequestBody, EmptyRequestParams } from "@app-types/http.requests";
import { HttpError } from "@errors/http-error";

export function errorMiddleware(
  err: unknown,
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    const payload: {
      success: boolean;
      message: string;
      error: { code: string; details?: unknown };
    } = {
      success: false,
      message: err.message,
      error: {
        code: err.code,
        ...(typeof err.details !== "undefined" ? { details: err.details } : {}),
      },
    };

    if (err.statusCode >= 500) {
      console.error(err);
    }

    return res.status(err.statusCode).json(payload);
  }

  console.error(err);

  const body: {
    success: boolean;
    message: string;
    error: { code: string; details?: unknown };
  } = {
    success: false,
    message: "Internal Server Error",
    error: {
      code: "INTERNAL_SERVER_ERROR",
    },
  };

  if (process.env.NODE_ENV === "development") {
    body.error.details = {
      message: (err as { message?: unknown } | null | undefined)?.message,
      stack: (err as { stack?: unknown } | null | undefined)?.stack,
    };
  }

  return res.status(500).json(body);
}

export default errorMiddleware;
