import { Router } from "express";
import { submitContactForm } from "@controllers/contact.controller";
import { validateContactForm } from "@validation/contact.validation";
import { EmptyRequestParams } from "@app-types/http.requests";

const router = Router();

router.post<EmptyRequestParams, unknown, unknown>(
  "/",
  validateContactForm,
  submitContactForm,
);

export default router;
