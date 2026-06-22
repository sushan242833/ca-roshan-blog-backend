import { Router } from "express";
import mediaController from "./media.controller";
import { mediaUploadMiddleware } from "./middleware/media-upload.middleware";
import { mediaErrorMiddleware } from "./middleware/media-error.middleware";
import { authMiddleware } from "@middleware/auth.middleware";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  IdRequestParams,
} from "@app-types/http.requests";

const router = Router();

router.post<EmptyRequestParams, unknown, EmptyRequestBody>(
  "/upload",
  authMiddleware,
  mediaUploadMiddleware,
  (req, res, next) => mediaController.upload(req, res, next),
);

router.get<EmptyRequestParams, unknown, EmptyRequestBody>("/", (req, res, next) =>
  mediaController.listAll(req, res, next),
);

router.get<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id",
  (req, res, next) => mediaController.getById(req, res, next),
);

router.delete<IdRequestParams, unknown, EmptyRequestBody>(
  "/:id",
  authMiddleware,
  (req, res, next) => mediaController.deleteById(req, res, next),
);

router.use(mediaErrorMiddleware);

export default router;
