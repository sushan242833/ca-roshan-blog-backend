import { Router } from "express";
import mediaController from "./media.controller";
import { mediaUploadMiddleware } from "./middleware/media-upload.middleware";
import { mediaErrorMiddleware } from "./middleware/media-error.middleware";
import { authMiddleware } from "@middleware/auth.middleware";

const router = Router();

router.post("/upload", authMiddleware, mediaUploadMiddleware, (req, res, next) =>
  mediaController.upload(req, res, next),
);

router.get("/", (req, res, next) => mediaController.listAll(req, res, next));

router.get("/:id", (req, res, next) => mediaController.getById(req, res, next));

router.delete("/:id", authMiddleware, (req, res, next) =>
  mediaController.deleteById(req, res, next),
);

router.use(mediaErrorMiddleware);

export default router;
