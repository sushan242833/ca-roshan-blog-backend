import { Router } from "express";
import * as controller from "@controllers/subscriber.controller";
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
  validateCreateSubscriber,
  controller.createSubscriber,
);
router.get<VerifySubscriberRequest, unknown, EmptyRequestBody>(
  "/verify/:token",
  validateSubscriberToken,
  controller.verifySubscriber,
);
router.post<VerifySubscriberRequest, unknown, EmptyRequestBody>(
  "/unsubscribe/:token",
  validateSubscriberToken,
  controller.unsubscribeSubscriber,
);

export default router;
