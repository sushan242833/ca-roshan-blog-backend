import { Router } from "express";
import * as controller from "@controllers/featured-post.controller";
import { authMiddleware } from "@middleware/auth.middleware";
import { validateUpdateFeaturedSlots } from "@validation/featured-post.validation";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  UpdateFeaturedSlotsRequest,
} from "@app-types/http.requests";

const router = Router();
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/",
  authMiddleware,
  controller.getFeaturedSlots,
);
router.put<EmptyRequestParams, unknown, UpdateFeaturedSlotsRequest>(
  "/",
  authMiddleware,
  validateUpdateFeaturedSlots,
  controller.replaceFeaturedSlots,
);

export default router;
