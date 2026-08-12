import { Router } from "express";
import * as controller from "@controllers/auth.controller";
import {
  validateChangePassword,
  validateLogin,
} from "@validation/auth.validation";
import { authMiddleware } from "@middleware/auth.middleware";
import { loginLimiter } from "@middleware/rate-limit";
import {
  ChangePasswordRequest,
  EmptyRequestBody,
  EmptyRequestParams,
  LoginRequest,
} from "@app-types/http.requests";

const router = Router();
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
// Rate limited as well as authenticated: the handler compares an
// attacker-supplied currentPassword against the stored hash, so a stolen access
// token must not buy unlimited guesses at the password itself.
router.post<EmptyRequestParams, unknown, ChangePasswordRequest>(
  "/password",
  authMiddleware,
  loginLimiter,
  validateChangePassword,
  controller.changePassword,
);
export default router;
