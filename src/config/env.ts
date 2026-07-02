import dotenv from "dotenv";
import path from "path";

const runtimeNodeEnv = process.env.NODE_ENV;
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (runtimeNodeEnv === "test") {
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.test"),
    override: true,
  });
}

export interface Env {
  PORT: number;
  NODE_ENV: "development" | "production" | "staging" | "test";
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  MEDIA_BASE_URL: string;
  APP_BASE_URL: string;
  API_BASE_URL: string;
  FRONTEND_URL: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM: string;
  CONTACT_EMAIL: string;
  NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND: number;
  // Only used at seed time (npm run db:seed-admin), never at runtime.
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_NAME?: string;
}

function getEnv(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (typeof val === "undefined") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return val as string;
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function getPositiveNumberEnv(name: string, fallback: string): number {
  const value = Number(getEnv(name, fallback));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return value;
}

const configuredPort = Number(getEnv("PORT", "4000"));
const appBaseUrl = getEnv("APP_BASE_URL", `http://localhost:${configuredPort}`);
const isTestEnvironment = runtimeNodeEnv === "test";
const configuredDatabaseName = getOptionalEnv("DB_NAME");
const testDatabaseName =
  getOptionalEnv("TEST_DB_NAME") ??
  (configuredDatabaseName
    ? configuredDatabaseName.toLowerCase().includes("test")
      ? configuredDatabaseName
      : `${configuredDatabaseName}_test`
    : "roshan_blog_test");

const env: Env = {
  PORT: configuredPort,
  NODE_ENV: getEnv("NODE_ENV", "development") as Env["NODE_ENV"],
  DB_HOST: getEnv("DB_HOST", isTestEnvironment ? "localhost" : undefined),
  DB_PORT: Number(getEnv("DB_PORT", "5432")),
  DB_NAME: isTestEnvironment ? testDatabaseName : getEnv("DB_NAME"),
  DB_USER: getEnv(
    "DB_USER",
    isTestEnvironment ? getEnv("USER", "postgres") : undefined,
  ),
  DB_PASSWORD: getEnv("DB_PASSWORD", isTestEnvironment ? "" : undefined),
  JWT_SECRET: getEnv(
    "JWT_SECRET",
    isTestEnvironment ? "test_jwt_secret" : undefined,
  ),
  JWT_REFRESH_SECRET: getEnv(
    "JWT_REFRESH_SECRET",
    isTestEnvironment ? "test_jwt_refresh_secret" : undefined,
  ),
  MEDIA_BASE_URL: getEnv(
    "MEDIA_BASE_URL",
    `http://localhost:${configuredPort}`,
  ),
  APP_BASE_URL: appBaseUrl,
  API_BASE_URL: getEnv("API_BASE_URL", appBaseUrl),
  FRONTEND_URL: getEnv("FRONTEND_URL", "http://localhost:3000"),
  RESEND_API_KEY: getOptionalEnv("RESEND_API_KEY"),
  EMAIL_FROM: getEnv("EMAIL_FROM", "Roshan Blog <onboarding@resend.dev>"),
  CONTACT_EMAIL: getEnv("CONTACT_EMAIL", "contact@caroshan.com"),
  NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND: getPositiveNumberEnv(
    "NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND",
    "2",
  ),
  ADMIN_EMAIL: getOptionalEnv("ADMIN_EMAIL"),
  ADMIN_PASSWORD: getOptionalEnv("ADMIN_PASSWORD"),
  ADMIN_NAME: getOptionalEnv("ADMIN_NAME"),
};

export { env };
