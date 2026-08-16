import "reflect-metadata";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { loginLimiter } from "@middleware/rate-limit";
import path from "path";
import { env } from "@config/env";
import sequelize from "@config/config";
import authRoutes from "@routes/auth.routes";
import postRoutes from "@routes/post.routes";
import tagRoutes from "@routes/tag.routes";
import categoryRoutes from "@routes/category.routes";
import subscriberRoutes from "@routes/subscriber.routes";
import adminSubscriberRoutes from "@routes/admin-subscriber.routes";
import mediaRoutes from "@modules/media/media.routes";
import contactRoutes from "@routes/contact.routes";
import errorMiddleware from "@middleware/error.middleware";
import { EmptyRequestBody, EmptyRequestParams } from "@app-types/http.requests";
import { setupSwagger } from "@config/swagger";

const app: Application = express();

// Must be set before the rate limiters so req.ip resolves to the real client
// IP (from X-Forwarded-For) rather than the proxy. A specific hop count is used
// instead of `true`, which would let a client spoof X-Forwarded-For to bypass
// the limit.
app.set("trust proxy", env.TRUST_PROXY);

// Compresses JSON and HTML responses. Placed before the routes so every handler
// benefits, and before express.static so /uploads is covered in local mode.
app.use(compression());

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const uploadsDirectory = path.resolve(process.cwd(), "uploads");
app.use(
  "/uploads",
  express.static(uploadsDirectory, {
    index: false,
    dotfiles: "deny",
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiters emit the project's standard error envelope (not the library's
// default plain-text body) so the frontend's unwrapResponse() parses a 429
// correctly instead of throwing "Invalid response from server."
function rateLimitHandler(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message,
      error: { code: "RATE_LIMITED" },
    });
  };
}

// A non-empty `search`/`q` param marks a request as a search, which is far more
// expensive (three ILIKE scans over an unindexed TEXT column) and gets the
// tighter limiter below.
function hasSearchQuery(req: Request): boolean {
  const value = req.query.search ?? req.query.q;
  if (Array.isArray(value)) {
    return value.some((v) => typeof v === "string" && v.trim().length > 0);
  }
  return typeof value === "string" && value.trim().length > 0;
}

const isTestEnv = env.NODE_ENV === "test";

// General API traffic: generous enough for live navbar search + paginated
// browsing. The test escape hatch raises the cap so integration tests don't
// trip it.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnv ? 1_000_000 : 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: rateLimitHandler(
    "Too many requests. Please slow down and try again shortly.",
  ),
});

// Search is deliberately much tighter and applies only to search requests.
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTestEnv ? 1_000_000 : 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => !hasSearchQuery(req),
  handler: rateLimitHandler(
    "Too many searches. Please wait a moment and try again.",
  ),
});

// General limiter covers all API routes; the search limiter is layered on the
// posts routes and only fires when a search term is present. /uploads is
// registered above, so images are never rate limited.
app.use("/api/v1", generalLimiter);
app.use("/api/v1/posts", searchLimiter);
app.use("/api/v1/auth/login", loginLimiter);

const healthHandler = (
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
) => {
  return res.json({ success: true, message: "Server is running" });
};

app.get("/health", healthHandler);
app.get("/api/v1/health", healthHandler);

// Liveness (above) answers "is the process up" and is what a platform health
// check should poll, because restarting the container cannot fix a database
// outage. Readiness (below) additionally proves the database is reachable and
// is what uptime monitoring and alerting should watch.
const readinessHandler = async (_req: Request, res: Response) => {
  try {
    await sequelize.authenticate();
    return res.json({
      success: true,
      message: "Ready",
      data: { database: "up" },
    });
  } catch (error: unknown) {
    console.error("Readiness check failed", error);
    return res.status(503).json({
      success: false,
      message: "Database unavailable",
      error: { code: "DEPENDENCY_UNAVAILABLE" },
    });
  }
};

app.get("/health/ready", readinessHandler);
app.get("/api/v1/health/ready", readinessHandler);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/subscribers", subscriberRoutes);
app.use("/api/v1/admin/subscribers", adminSubscriberRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/tags", tagRoutes);
app.use("/api/v1/media", mediaRoutes);
// Gated behind a feature flag. Gating the mount (not the controller body) means
// an unmounted route 404s, so no live endpoint emails the owner while off.
if (env.FEATURE_FLAG_CONTACT_PAGE) {
  app.use("/api/v1/contact", contactRoutes);
}

setupSwagger(app);
app.use(errorMiddleware);

export default app;
