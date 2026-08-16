import { Router } from "express";
import * as controller from "@controllers/subscriber.controller";
import { emailLimiter } from "@middleware/rate-limit";
import {
  validateCreateSubscriber,
  validateSubscriberToken,
} from "@validation/subscriber.validation";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  SubscribeRequest,
  SubscriberTokenRequest,
} from "@app-types/http.requests";

const router = Router();
router.post<EmptyRequestParams, unknown, SubscribeRequest>(
  "/",
  emailLimiter,
  validateCreateSubscriber,
  controller.createSubscriber,
);
router.get<SubscriberTokenRequest, unknown, EmptyRequestBody>(
  "/unsubscribe/:token",
  validateSubscriberToken,
  controller.getUnsubscribeStatus,
);
router.post<SubscriberTokenRequest, unknown, EmptyRequestBody>(
  "/unsubscribe/:token",
  validateSubscriberToken,
  controller.unsubscribeSubscriber,
);

export default router;
