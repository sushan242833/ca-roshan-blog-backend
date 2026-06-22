import { NextFunction, Request, Response } from "express";
import { EmptyRequestBody, EmptyRequestParams } from "@app-types/http.requests";

interface AppErrorShape {
  status?: number;
  statusCode?: number;
  code?: string;
  message?: string;
  details?: unknown;
  stack?: string;
}

function isAppErrorShape(value: unknown): value is AppErrorShape {
  return typeof value === "object" && value !== null;
}

export function errorMiddleware(
  err: unknown,
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  _next: NextFunction,
) {
  let status = 500;
  let message = "Internal Server Error";
  let code = "INTERNAL_SERVER_ERROR";
  let details: unknown;

  if (isAppErrorShape(err)) {
    const candidateStatus = Number(err.statusCode ?? err.status);
    if (
      Number.isFinite(candidateStatus) &&
      candidateStatus >= 400 &&
      candidateStatus < 600
    ) {
      status = candidateStatus;
    }

    if (typeof err.message === "string" && err.message.length > 0) {
      message = err.message;
    }

    if (typeof err.code === "string" && err.code.length > 0) {
      code = err.code;
    }

    details = err.details;
  }

  const payload: {
    success: boolean;
    message: string;
    error: { code: string; details?: unknown };
  } = {
    success: false,
    message,
    error: {
      code,
    },
  };

  if (typeof details !== "undefined") {
    payload.error.details = details;
  } else if (process.env.NODE_ENV === "development" && isAppErrorShape(err)) {
    payload.error.details = { stack: err.stack };
  }

  console.error(err);
  res.status(status).json(payload);
}

export default errorMiddleware;
