import { Router } from "express";
import * as controller from "@controllers/subscriber.controller";
import { authMiddleware } from "@middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, controller.adminListSubscribers);
router.get("/stats", authMiddleware, controller.adminSubscriberStats);

export default router;
