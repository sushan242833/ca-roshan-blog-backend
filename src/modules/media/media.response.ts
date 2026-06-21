import { Response } from "express";

interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T,
  meta?: Record<string, unknown>,
): Response<ApiSuccessResponse<T>> {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: unknown,
): Response<ApiErrorResponse> {
  const payload: ApiErrorResponse = {
    success: false,
    message,
    error: { code },
  };

  if (typeof details !== "undefined") {
    payload.error.details = details;
  }

  return res.status(statusCode).json(payload);
}
