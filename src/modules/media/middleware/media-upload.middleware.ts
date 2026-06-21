import { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MediaUploadRequestShape,
  MAX_MEDIA_UPLOAD_SIZE_BYTES,
  UploadMediaDto,
  assertAllowedImageMimeType,
  buildStoredFileName,
  sanitizeOriginalFileName,
} from "../media.dto";
import {
  BadRequestError,
  UnsupportedMediaTypeError,
} from "../media.errors";

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MEDIA_UPLOAD_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return callback(
        new UnsupportedMediaTypeError(
          "Invalid file type. Only JPEG, PNG, and WEBP are allowed.",
        ),
      );
    }
    return callback(null, true);
  },
}).single("file");

export function mediaUploadMiddleware(
  req: Request,
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
      assertAllowedImageMimeType(req.file.mimetype);

      const dto: UploadMediaDto = {
        fileName: buildStoredFileName(req.file.mimetype),
        originalName: sanitizeOriginalFileName(req.file.originalname),
        mimeType: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      };

      const mediaRequest = req as Request & MediaUploadRequestShape;
      mediaRequest.mediaUploadFile = dto;
      return next();
    } catch (dtoError: unknown) {
      return next(dtoError);
    }
  });
}

export default mediaUploadMiddleware;
