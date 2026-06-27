import { NextFunction, Request, Response } from "express";
import mediaService from "./media.service";
import { Media } from "./media.model";
import { MediaUploadRequestShape } from "./media.dto";
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
    size: media.size,
    url: media.url,
    provider: media.provider,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  };
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
    _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const mediaItems = await mediaService.listAll();
      return sendSuccess(
        res,
        200,
        "Media list fetched successfully.",
        mediaItems.map(toMediaResponseDto),
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
      return res.status(204).send();
    } catch (error: unknown) {
      return next(error);
    }
  }
}

const mediaController = new MediaController();

export default mediaController;
