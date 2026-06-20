import { Router } from "express";
import * as TagController from "@controllers/tag.controller";
import {
  validateCreateTag,
  validateUpdateTag,
} from "@validation/tag.validation";
import { authMiddleware } from "@middleware/auth.middleware";

const router = Router();

router.get("/", TagController.listTags);

// admin
router.post("/", authMiddleware, validateCreateTag, TagController.createTag);
router.put("/:id", authMiddleware, validateUpdateTag, TagController.updateTag);
router.delete("/:id", authMiddleware, TagController.deleteTag);

export default router;
