import { NextFunction, Request, Response } from "express";
import { CreateTagDto } from "@dto/create-tag.dto";
import { UpdateTagDto } from "@dto/update-tag.dto";
import TagService from "@services/tag.service";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  IdRequestParams,
} from "@app-types/http.requests";

export async function createTag(
  req: Request<EmptyRequestParams, unknown, CreateTagDto>,
  res: Response,
  next: NextFunction,
) {
  try {
    const tag = await TagService.create(req.body);
    return res.status(201).json({ success: true, data: tag });
  } catch (err) {
    return next(err);
  }
}

export async function updateTag(
  req: Request<IdRequestParams, unknown, UpdateTagDto>,
  res: Response,
  next: NextFunction,
) {
  try {
    const tag = await TagService.update(req.params.id, req.body);
    return res.json({ success: true, data: tag });
  } catch (err) {
    return next(err);
  }
}

export async function deleteTag(
  req: Request<IdRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    await TagService.delete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

export async function listTags(
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const tags = await TagService.getAll();
    return res.json({ success: true, data: tags });
  } catch (err) {
    return next(err);
  }
}
