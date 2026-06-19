import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./env";
import authRoutes from "@routes/auth.routes";

const app: Application = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

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

export default app;
