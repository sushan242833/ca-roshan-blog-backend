import { Router } from "express";
import { submitContactForm } from "@controllers/contact.controller";
import { validateContactForm } from "@validation/contact.validation";

const router = Router();

router.post("/", validateContactForm, submitContactForm);

export default router;
