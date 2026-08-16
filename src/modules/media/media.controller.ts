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

interface MediaResponseDto {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  url: string;
  provider: string;
  /** Referenced by a post or the author profile, so it cannot be deleted. */
  inUse: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toMediaResponseDto(media: Media, inUse: boolean): MediaResponseDto {
  return {
    id: media.id,
    fileName: media.fileName,
    originalName: media.originalName,
    mimeType: media.mimeType,
    kind: resolveMediaKind(media.mimeType),
    size: media.size,
    url: media.url,
    provider: media.provider,
    inUse,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  };
}

// ?type=image|document narrows the listing; anything else lists everything.
function parseMediaKindQuery(value: unknown): MediaKind | undefined {
  if (value === "image" || value === "document") {
    return value;
  }
  return undefined;
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
        // Nothing can reference a file that did not exist a moment ago.
        toMediaResponseDto(media, false),
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
      const mediaItems = await mediaService.listAll(kind);
      return sendSuccess(
        res,
        200,
        "Media list fetched successfully.",
        mediaItems.map((item) => toMediaResponseDto(item.media, item.inUse)),
      );
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
      const { media, inUse } = await mediaService.getByIdWithUsage(
        req.params.id,
      );
      return sendSuccess(
        res,
        200,
        "Media fetched successfully.",
        toMediaResponseDto(media, inUse),
      );
    } catch (error: unknown) {
      return next(error);
    }
  }

  // Lets the admin UI show whether a file is deletable before offering the
  // action, instead of relying on the 409 that DELETE would return.
  async getUsageById(
    req: Request<IdRequestParams, unknown, EmptyRequestBody>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const usage = await mediaService.getUsage(req.params.id);
      return sendSuccess(res, 200, "Media usage fetched successfully.", usage);
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
      return res.status(204).send();
    } catch (error: unknown) {
      return next(error);
    }
  }
}

const mediaController = new MediaController();

export default mediaController;
