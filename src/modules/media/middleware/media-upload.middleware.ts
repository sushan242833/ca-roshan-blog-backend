import { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  MediaUploadRequestShape,
  MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
  UploadMediaDto,
  assertAllowedMimeType,
  buildStoredFileName,
  isAllowedMimeType,
  sanitizeOriginalFileName,
} from "../media.dto";
import {
  BadRequestError,
  UnsupportedMediaTypeError,
} from "../media.errors";
import {
  EmptyRequestBody,
  EmptyRequestParams,
} from "@app-types/http.requests";

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Use the larger (document) ceiling here so PDFs are not rejected by
    // multer before the per-kind size check runs; images above their own 5MB
    // limit are still rejected by assertUploadMediaDto below.
    fileSize: MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedMimeType(file.mimetype)) {
      return callback(
        new UnsupportedMediaTypeError(
          "Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed.",
        ),
      );
    }
    return callback(null, true);
  },
}).single("file");

export function mediaUploadMiddleware(
  req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
): void {
  multerUpload(req, res, (error: unknown) => {
    if (error) {
      return next(error);
    }

    if (!req.file) {
      return next(
        new BadRequestError("No file was uploaded. Expected field name `file`."),
      );
    }

    try {
      assertAllowedMimeType(req.file.mimetype);

      const dto: UploadMediaDto = {
        fileName: buildStoredFileName(req.file.mimetype),
        originalName: sanitizeOriginalFileName(req.file.originalname),
        mimeType: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      };

      const mediaRequest = req as Request<
        EmptyRequestParams,
        unknown,
        EmptyRequestBody
      > &
        MediaUploadRequestShape;
      mediaRequest.mediaUploadFile = dto;
      return next();
    } catch (dtoError: unknown) {
      return next(dtoError);
    }
  });
}

export default mediaUploadMiddleware;
