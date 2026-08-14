import { NextFunction, Request, Response } from "express";
import mediaService from "./media.service";
import { Media } from "./media.model";
import {
  MediaKind,
  MediaUploadRequestShape,
  resolveMediaKind,
} from "./media.dto";
import { BadRequestError } from "./media.errors";
import { sendSuccess } from "./media.response";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  IdRequestParams,
} from "@app-types/http.requests";
import { auditContext, recordAudit } from "@utils/audit";

interface MediaResponseDto {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  url: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

function toMediaResponseDto(media: Media): MediaResponseDto {
  return {
    id: media.id,
    fileName: media.fileName,
    originalName: media.originalName,
    mimeType: media.mimeType,
    kind: resolveMediaKind(media.mimeType),
    size: media.size,
    url: media.url,
    provider: media.provider,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  };
}

// The media library grows without bound, so the listing is paginated. The
// default page size fills the picker grid; the cap stops a caller asking for
// the whole library in one response.
const DEFAULT_MEDIA_LIMIT = 24;
const MAX_MEDIA_LIMIT = 100;

// ?type=image|document narrows the listing; anything else lists everything.
function parseMediaKindQuery(value: unknown): MediaKind | undefined {
  if (value === "image" || value === "document") {
    return value;
  }
  return undefined;
}

// A malformed page/limit falls back to the default rather than 400-ing: this is
// an internal admin listing, and a bad query string should not break the picker.
function parsePositiveIntQuery(value: unknown, fallback: number): number {
  const raw = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
}

class MediaController {
  async upload(
    req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const mediaRequest = req as Request<
        EmptyRequestParams,
        unknown,
        EmptyRequestBody
      > &
        MediaUploadRequestShape;
      if (!mediaRequest.mediaUploadFile) {
        throw new BadRequestError(
          "Media upload payload missing. Upload must include `file`.",
        );
      }

      const media = await mediaService.upload(mediaRequest.mediaUploadFile);
      return sendSuccess(
        res,
        201,
        "Media uploaded successfully.",
        toMediaResponseDto(media),
      );
    } catch (error: unknown) {
      return next(error);
    }
  }

  async listAll(
    req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const kind = parseMediaKindQuery(req.query.type);
      const page = parsePositiveIntQuery(req.query.page, 1);
      const limit = Math.min(
        parsePositiveIntQuery(req.query.limit, DEFAULT_MEDIA_LIMIT),
        MAX_MEDIA_LIMIT,
      );

      const result = await mediaService.list(page, limit, kind);

      // Shaped like the other paginated endpoints ({ items, pagination }) so
      // the picker and the library page consume it the same way.
      return sendSuccess(res, 200, "Media list fetched successfully.", {
        items: result.items.map(toMediaResponseDto),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error: unknown) {
      return next(error);
    }
  }

  async getById(
    req: Request<IdRequestParams, unknown, EmptyRequestBody>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const media = await mediaService.getById(req.params.id);
      return sendSuccess(
        res,
        200,
        "Media fetched successfully.",
        toMediaResponseDto(media),
      );
    } catch (error: unknown) {
      return next(error);
    }
  }

  async deleteById(
    req: Request<IdRequestParams, unknown, EmptyRequestBody>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await mediaService.deleteById(req.params.id);

      const { ip, userAgent } = auditContext(req);
      await recordAudit({
        action: "media.delete",
        outcome: "success",
        actorId: req.user?.id ?? null,
        targetType: "media",
        targetId: req.params.id,
        ip,
        userAgent,
      });

      return res.status(204).send();
    } catch (error: unknown) {
      return next(error);
    }
  }
}

const mediaController = new MediaController();

export default mediaController;
