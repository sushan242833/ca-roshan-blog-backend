import { Router } from "express";
import * as controller from "@controllers/post.controller";
import { authMiddleware } from "@middleware/auth.middleware";
import {
  validateCreatePost,
  validateUpdatePost,
} from "@validation/post.validation";
import {
  CreatePostRequest,
  EmptyRequestBody,
  EmptyRequestParams,
  IdRequestParams,
  SlugRequestParams,
  UpdatePostRequest,
} from "@app-types/http.requests";

const router = Router();
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/",
  controller.listPublished,
);
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/featured",
  controller.listFeatured,
);
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/admin/list",
  authMiddleware,
  controller.adminList,
);
router.post<EmptyRequestParams, unknown, CreatePostRequest>(
  "/",
  authMiddleware,
  validateCreatePost,
  controller.createPost,
);
router.patch<IdRequestParams, unknown, UpdatePostRequest>(
  "/:id",
  authMiddleware,
  validateUpdatePost,
  controller.updatePost,
);
router.delete<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id",
  authMiddleware,
  controller.deletePost,
);
router.post<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id/publish",
  authMiddleware,
  controller.publishPost,
);
router.post<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id/archive",
  authMiddleware,
  controller.archivePost,
);
router.post<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id/restore",
  authMiddleware,
  controller.restorePost,
);
router.post<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id/unpublish",
  authMiddleware,
  controller.unpublishPost,
);
router.get<SlugRequestParams, unknown, EmptyRequestBody>(
  "/:slug",
  controller.getBySlug,
);

export default router;
