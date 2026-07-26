import { Router } from "express";
import { submitContactForm } from "@controllers/contact.controller";
import { emailLimiter } from "@middleware/rate-limit";
import { validateContactForm } from "@validation/contact.validation";

const router = Router();

router.post("/", emailLimiter, validateContactForm, submitContactForm);

export default router;
