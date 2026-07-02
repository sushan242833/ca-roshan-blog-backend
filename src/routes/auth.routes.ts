import { Router } from "express";
import * as controller from "@controllers/auth.controller";
import { validateLogin, validateUpdateProfile } from "@validation/auth.validation";
import { authMiddleware } from "@middleware/auth.middleware";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  LoginRequest,
} from "@app-types/http.requests";

const router = Router();
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/about",
  controller.getAboutPage,
);
router.post<EmptyRequestParams, unknown, LoginRequest>(
  "/login",
  validateLogin,
  controller.login,
);
router.post<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/logout",
  authMiddleware,
  controller.logout,
);
router.post<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/refresh",
  controller.refresh,
);
router.get<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/me",
  authMiddleware,
  controller.me,
);
router.patch<EmptyRequestParams, unknown, unknown>(
  "/profile",
  authMiddleware,
  validateUpdateProfile,
  controller.updateProfile,
);

export default router;
