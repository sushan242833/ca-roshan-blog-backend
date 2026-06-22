import "reflect-metadata";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { env } from "@config/env";
import authRoutes from "@routes/auth.routes";
import postRoutes from "@routes/post.routes";
import tagRoutes from "@routes/tag.routes";
import categoryRoutes from "@routes/category.routes";
import subscriberRoutes from "@routes/subscriber.routes";
import adminSubscriberRoutes from "@routes/admin-subscriber.routes";
import mediaRoutes from "@modules/media/media.routes";
import errorMiddleware from "@middleware/error.middleware";
import { EmptyRequestBody, EmptyRequestParams } from "@app-types/http.requests";
import { setupSwagger } from "@config/swagger";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "test" ? 1000 : 100,
});
app.use(limiter);
const healthHandler = (
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
) => {
  return res.json({ success: true, message: "Server is running" });
};

app.get("/health", healthHandler);
app.get("/api/v1/health", healthHandler);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/subscribers", subscriberRoutes);
app.use("/api/v1/admin/subscribers", adminSubscriberRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/tags", tagRoutes);
app.use("/api/v1/media", mediaRoutes);

setupSwagger(app);
app.use(errorMiddleware);

export default app;
