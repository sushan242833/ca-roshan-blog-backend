import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { env } from "@config/env";

// Tight limiter for endpoints that send email (subscribe, contact) so an
// unauthenticated caller can't bomb an inbox or burn the email provider's
// quota. Kept active in every environment (including tests) because it is a
// security control, not incidental middleware.
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      error: { code: "RATE_LIMITED" },
    });
  },
});

// Brute-force guard for the credential-checking routes: POST /auth/login and
// POST /auth/password, which both compare an attacker-supplied password
// against a stored hash. Shared deliberately, so the two cannot be used as
// separate budgets against the same account.
//
// skipSuccessfulRequests means a legitimate admin working normally never
// spends the budget; only failures count toward it. The test escape hatch
// raises the cap so integration tests don't trip it.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1_000_000 : 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again later.",
      error: { code: "RATE_LIMITED" },
    });
  },
});

export default emailLimiter;
