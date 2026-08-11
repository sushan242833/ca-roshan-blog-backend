import { ErrorRequestHandler } from "express";
import multer from "multer";
import {
  BadRequestError,
  HttpError,
  InternalServerError,
  PayloadTooLargeError,
} from "../media.errors";
import { sendError } from "../media.response";

function mapToHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new PayloadTooLargeError(
        "File too large. Images may be up to 5MB and PDFs up to 20MB.",
      );
    }

    return new BadRequestError("Invalid multipart upload payload.");
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
