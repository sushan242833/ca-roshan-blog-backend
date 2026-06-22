import { Request, Response } from "express";
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
) {
  const tag = await TagService.create(req.body);
  return res.status(201).json({ data: tag });
}

export async function updateTag(
  req: Request<IdRequestParams, unknown, UpdateTagDto>,
  res: Response,
) {
  const tag = await TagService.update(req.params.id, req.body);
  return res.json({ data: tag });
}

export async function deleteTag(
  req: Request<IdRequestParams, unknown, EmptyRequestBody>,
  res: Response,
) {
  await TagService.delete(req.params.id);
  return res.status(204).send();
}

export async function listTags(
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
) {
  const tags = await TagService.getAll();
  return res.json({ data: tags });
}
