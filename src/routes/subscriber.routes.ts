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
  VerifySubscriberRequest,
} from "@app-types/http.requests";

const router = Router();
router.post<EmptyRequestParams, unknown, SubscribeRequest>(
  "/",
  emailLimiter,
  validateCreateSubscriber,
  controller.createSubscriber,
);
router.get<VerifySubscriberRequest, unknown, EmptyRequestBody>(
  "/verify/:token",
  validateSubscriberToken,
  controller.verifySubscriber,
);
router.get<VerifySubscriberRequest, unknown, EmptyRequestBody>(
  "/unsubscribe/:token",
  validateSubscriberToken,
  controller.getUnsubscribeStatus,
);
router.post<VerifySubscriberRequest, unknown, EmptyRequestBody>(
  "/unsubscribe/:token",
  validateSubscriberToken,
  controller.unsubscribeSubscriber,
);

export default router;
