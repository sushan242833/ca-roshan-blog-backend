import { Router } from "express";
import * as controller from "@controllers/subscriber.controller";
import { authMiddleware } from "@middleware/auth.middleware";
import { EmptyRequestBody, EmptyRequestParams } from "@app-types/http.requests";

const router = Router();
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/",
  authMiddleware,
  controller.adminListSubscribers,
);
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/stats",
  authMiddleware,
  controller.adminSubscriberStats,
);

export default router;
