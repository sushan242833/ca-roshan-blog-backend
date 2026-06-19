import "reflect-metadata";
import app from "@config/app";
import sequelize from "@config/config";
import { env } from "@config/env";
import { registerModels } from "@models/index";
import http from "http";

const MAX_LISTEN_RETRIES = 6;
const RETRY_DELAY_MS = 500;

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const startServer = async () => {
  try {
    // register decorated models with sequelize now that reflect-metadata is loaded
    registerModels(sequelize);
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    let server: http.Server | null = null;
    let attempt = 0;
    while (attempt < MAX_LISTEN_RETRIES) {
      try {
        server = app.listen(env.PORT, () => {
          console.log(`Server listening on port ${env.PORT}`);
        });
        break; // success
      } catch (err: any) {
        if (err && err.code === "EADDRINUSE") {
          attempt += 1;
          console.warn(
            `Port ${env.PORT} in use, retrying (${attempt}/${MAX_LISTEN_RETRIES})...`,
          );
          await wait(RETRY_DELAY_MS);
          continue;
        }
        throw err;
      }
    }

    if (!server) {
      console.error(
        `Could not bind to port ${env.PORT} after ${MAX_LISTEN_RETRIES} attempts.`,
      );
      process.exit(1);
    }

    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      try {
        await sequelize.close();
        server?.close(() => {
          console.log("HTTP server closed");
          process.exit(0);
        });
      } catch (e) {
        console.error("Error during shutdown", e);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGUSR2", () => shutdown("SIGUSR2"));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
