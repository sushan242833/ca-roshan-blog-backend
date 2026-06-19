import { Router } from "express";
import * as controller from "@controller/auth.controller";
import { validateLogin } from "@validation/auth.validation";
import { authMiddleware } from "@middleware/auth.middleware";

const router = Router();

router.post("/login", validateLogin, controller.login);
router.post("/logout", authMiddleware, controller.logout);
router.post("/refresh", controller.refresh);
router.get("/me", authMiddleware, controller.me);

export default router;
