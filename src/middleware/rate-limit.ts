import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

// Tight limiter for endpoints that send email (subscribe, contact) so an
// unauthenticated caller can't bomb an inbox or burn the email provider's
// quota. Kept active in every environment (including tests) because it is a
// security control, not incidental middleware.
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      error: { code: "RATE_LIMITED" },
    });
  },
});

export default emailLimiter;
