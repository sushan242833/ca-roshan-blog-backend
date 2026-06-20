import { Request, Response } from "express";
import TagService from "@services/tag.service";

export async function createTag(req: Request, res: Response) {
  const tag = await TagService.create(req.body);
  return res.status(201).json({ data: tag });
}

export async function updateTag(req: Request, res: Response) {
  const tag = await TagService.update(req.params.id, req.body);
  return res.json({ data: tag });
}

export async function deleteTag(req: Request, res: Response) {
  await TagService.delete(req.params.id);
  return res.status(204).send();
}

export async function listTags(req: Request, res: Response) {
  const tags = await TagService.getAll();
  return res.json({ data: tags });
}
