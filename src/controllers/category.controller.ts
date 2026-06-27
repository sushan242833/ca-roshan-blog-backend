import { NextFunction, Request, Response } from "express";
import { CreateCategoryDto } from "@dto/create-category.dto";
import { UpdateCategoryDto } from "@dto/update-category.dto";
import CategoryService from "@services/category.service";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  IdRequestParams,
} from "@app-types/http.requests";

export async function createCategory(
  req: Request<EmptyRequestParams, unknown, CreateCategoryDto>,
  res: Response,
  next: NextFunction,
) {
  try {
    const category = await CategoryService.create(req.body);
    return res.status(201).json({ success: true, data: category });
  } catch (err: unknown) {
    return next(err);
  }
}

export async function updateCategory(
  req: Request<IdRequestParams, unknown, UpdateCategoryDto>,
  res: Response,
  next: NextFunction,
) {
  try {
    const category = await CategoryService.update(req.params.id, req.body);
    return res.json({ success: true, data: category });
  } catch (err: unknown) {
    return next(err);
  }
}

export async function deleteCategory(
  req: Request<IdRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    await CategoryService.delete(req.params.id);
    return res.status(204).send();
  } catch (err: unknown) {
    return next(err);
  }
}

export async function listCategories(
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const categories = await CategoryService.getAll();
    return res.json({ success: true, data: categories });
  } catch (err: unknown) {
    return next(err);
  }
}
