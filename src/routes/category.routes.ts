import { Router } from "express";
import * as CategoryController from "@controllers/category.controller";
import {
  validateCreateCategory,
  validateUpdateCategory,
} from "@validation/category.validation";
import { authMiddleware } from "@middleware/auth.middleware";
import { CreateCategoryDto } from "@dto/create-category.dto";
import { UpdateCategoryDto } from "@dto/update-category.dto";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  IdRequestParams,
} from "@app-types/http.requests";

const router = Router();
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/",
  CategoryController.listCategories,
);
router.post<EmptyRequestParams, unknown, CreateCategoryDto>(
  "/",
  authMiddleware,
  validateCreateCategory,
  CategoryController.createCategory,
);
router.patch<IdRequestParams, unknown, UpdateCategoryDto>(
  "/:id",
  authMiddleware,
  validateUpdateCategory,
  CategoryController.updateCategory,
);
router.put<IdRequestParams, unknown, UpdateCategoryDto>(
  "/:id",
  authMiddleware,
  validateUpdateCategory,
  CategoryController.updateCategory,
);
router.delete<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id",
  authMiddleware,
  CategoryController.deleteCategory,
);

export default router;
