import { Router } from "express";
import * as controller from "@controllers/subscriber.controller";
import {
  validateCreateSubscriber,
  validateSubscriberToken,
} from "@validation/subscriber.validation";

const router = Router();

router.post("/", validateCreateSubscriber, controller.createSubscriber);
router.get(
  "/verify/:token",
  validateSubscriberToken,
  controller.verifySubscriber,
);
router.post(
  "/unsubscribe/:token",
  validateSubscriberToken,
  controller.unsubscribeSubscriber,
);
router.get(
  "/unsubscribe/:token",
  validateSubscriberToken,
  controller.unsubscribeSubscriber,
);

export default router;
