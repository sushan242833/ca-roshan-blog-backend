import { ErrorRequestHandler } from "express";
import multer from "multer";
import {
  BadRequestError,
  HttpError,
  InternalServerError,
  PayloadTooLargeError,
} from "../media.errors";
import { sendError } from "../media.response";

interface LegacyErrorShape {
  status?: number;
  statusCode?: number;
  code?: string;
  message?: string;
  details?: unknown;
}

function isLegacyErrorShape(value: unknown): value is LegacyErrorShape {
  return typeof value === "object" && value !== null;
}

function mapToHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new PayloadTooLargeError(
        "File too large. Maximum allowed size is 5MB.",
      );
    }

    return new BadRequestError("Invalid multipart upload payload.");
  }

  if (isLegacyErrorShape(error)) {
    const statusCode = Number(error.statusCode ?? error.status);
    const message = error.message ?? "Request failed";

    if (Number.isFinite(statusCode) && statusCode >= 400 && statusCode < 600) {
      return new HttpError(
        statusCode,
        message,
        error.code ?? "REQUEST_ERROR",
        error.details,
      );
    }
  }

  return new InternalServerError("Internal server error.");
}

export const mediaErrorMiddleware: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  const mappedError = mapToHttpError(error);

  if (mappedError.statusCode >= 500) {
    console.error(error);
  }

  return sendError(
    res,
    mappedError.statusCode,
    mappedError.message,
    mappedError.code,
    mappedError.details,
  );
};

export default mediaErrorMiddleware;
