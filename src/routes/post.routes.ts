import { Router } from "express";
import * as controller from "@controllers/post.controller";
import * as chapterController from "@controllers/chapter.controller";
import { authMiddleware } from "@middleware/auth.middleware";
import {
  validateCreatePost,
  validatePostIdParam,
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
// A literal one-segment path, so it MUST stay above the GET /:slug catch-all
// below or "chapter-manifest" would be read as a post slug and 404.
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/chapter-manifest",
  chapterController.getChapterManifest,
);
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/admin/list",
  authMiddleware,
  controller.adminList,
);
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/admin/stats",
  authMiddleware,
  controller.getDashboardStats,
);
// Registered after the literal /admin/* routes (which win by order) and
// before the GET /:slug catch-all.
router.get<IdRequestParams, unknown, EmptyRequestBody>(
  "/admin/:id",
  authMiddleware,
  validatePostIdParam,
  controller.getAdminPostById,
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
router.post<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id/preview-token",
  authMiddleware,
  controller.generatePreviewToken,
);
// Chapter previews, registered above the two-segment /preview/:token so the
// longer paths are matched first.
router.get<{ token: string }, unknown, EmptyRequestBody>(
  "/preview/:token/chapters",
  chapterController.getPreviewChapterIndex,
);
router.get<{ token: string; chapterId: string }, unknown, EmptyRequestBody>(
  "/preview/:token/chapters/:chapterId",
  chapterController.getPreviewChapter,
);

router.get<{ token: string }, unknown, EmptyRequestBody>(
  "/preview/:token",
  controller.getByPreviewToken,
);
// Registered above the GET /:slug catch-all so they are matched first. These
// are two- and three-segment paths, so they cannot collide with the
// one-segment /:slug, but the ordering keeps the intent obvious.
router.get<SlugRequestParams, unknown, EmptyRequestBody>(
  "/:slug/chapters",
  chapterController.getChapterIndex,
);
router.get<SlugRequestParams & { chapterId: string }, unknown, EmptyRequestBody>(
  "/:slug/chapters/:chapterId",
  chapterController.getChapter,
);

router.get<SlugRequestParams, unknown, EmptyRequestBody>(
  "/:slug",
  controller.getBySlug,
);

export default router;
