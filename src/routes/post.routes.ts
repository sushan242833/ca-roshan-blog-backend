import { Router } from "express";
import * as controller from "@controllers/post.controller";
import { authMiddleware } from "@middleware/auth.middleware";
import {
  validateCreatePost,
  validateUpdatePost,
} from "@validation/post.validation";

const router = Router();

// Public
router.get("/", controller.listPublished);
router.get("/featured", controller.listFeatured);

// Admin
router.get("/admin/list", authMiddleware, controller.adminList);
router.post("/", authMiddleware, validateCreatePost, controller.createPost);
router.put("/:id", authMiddleware, validateUpdatePost, controller.updatePost);
router.delete("/:id", authMiddleware, controller.deletePost);
router.post("/:id/publish", authMiddleware, controller.publishPost);
router.post("/:id/archive", authMiddleware, controller.archivePost);
router.post("/:id/restore", authMiddleware, controller.restorePost);
router.post("/:id/unpublish", authMiddleware, controller.unpublishPost);

router.get("/:slug", controller.getBySlug);

export default router;
