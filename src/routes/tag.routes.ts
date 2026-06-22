import { Router } from "express";
import * as TagController from "@controllers/tag.controller";
import {
  validateCreateTag,
  validateUpdateTag,
} from "@validation/tag.validation";
import { authMiddleware } from "@middleware/auth.middleware";
import { CreateTagDto } from "@dto/create-tag.dto";
import { UpdateTagDto } from "@dto/update-tag.dto";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  IdRequestParams,
} from "@app-types/http.requests";

const router = Router();

router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/",
  TagController.listTags,
);

// admin
router.post<EmptyRequestParams, unknown, CreateTagDto>(
  "/",
  authMiddleware,
  validateCreateTag,
  TagController.createTag,
);
router.put<IdRequestParams, unknown, UpdateTagDto>(
  "/:id",
  authMiddleware,
  validateUpdateTag,
  TagController.updateTag,
);
router.delete<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id",
  authMiddleware,
  TagController.deleteTag,
);

export default router;
