import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { env } from "./env";
import authRoutes from "@routes/auth.routes";
import postRoutes from "@routes/post.routes";
import tagRoutes from "@routes/tag.routes";
import subscriberRoutes from "@routes/subscriber.routes";
import adminSubscriberRoutes from "@routes/admin-subscriber.routes";
import mediaRoutes from "@modules/media/media.routes";
import errorMiddleware from "@middleware/error.middleware";

const app: Application = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

const uploadsDirectory = path.resolve(process.cwd(), "uploads");
app.use(
  "/uploads",
  express.static(uploadsDirectory, {
    index: false,
    dotfiles: "deny",
  }),
);

// Logging
if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting - placeholder defaults
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  return res.json({ success: true, message: "Server is running" });
});

// Auth routes
app.use("/api/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/subscribers", subscriberRoutes);
app.use("/api/v1/admin/subscribers", adminSubscriberRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/v1/media", mediaRoutes);

app.use(errorMiddleware);

export default app;
