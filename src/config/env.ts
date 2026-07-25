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
  // Number of reverse-proxy hops in front of the app, used by
  // app.set("trust proxy", ...). Kept as a specific hop count (not `true`) so a
  // client cannot spoof X-Forwarded-For to escape rate limiting.
  TRUST_PROXY: number;
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
  EMAIL_PROVIDER?: "console" | "resend";
  EMAIL_FROM: string;
  CONTACT_EMAIL: string;
  NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND: number;
  // Feature flags: "1"/"true" = on, "0"/unset = off (default off).
  FEATURE_FLAG_CONTACT_PAGE: boolean;
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

function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = getOptionalEnv(name);
  if (typeof value === "undefined") {
    return fallback;
  }
  return value === "1" || value.toLowerCase() === "true";
}

const resolvedNodeEnv = getEnv("NODE_ENV", "development") as Env["NODE_ENV"];

function getTrustProxyEnv(nodeEnv: Env["NODE_ENV"]): number {
  const raw = getOptionalEnv("TRUST_PROXY");
  if (typeof raw === "undefined") {
    // Behind a proxy in production, req.ip must resolve to the client, not the
    // proxy — otherwise every visitor shares one rate-limit bucket.
    return nodeEnv === "production" ? 1 : 0;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("TRUST_PROXY must be a non-negative integer hop count");
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
  NODE_ENV: resolvedNodeEnv,
  TRUST_PROXY: getTrustProxyEnv(resolvedNodeEnv),
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
  EMAIL_PROVIDER: (() => {
    const value = getOptionalEnv("EMAIL_PROVIDER")?.toLowerCase();
    return value === "console" || value === "resend" ? value : undefined;
  })(),
  EMAIL_FROM: getEnv("EMAIL_FROM", "Roshan Blog <onboarding@resend.dev>"),
  CONTACT_EMAIL: getEnv("CONTACT_EMAIL", "contact@caroshan.com"),
  NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND: getPositiveNumberEnv(
    "NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND",
    "2",
  ),
  FEATURE_FLAG_CONTACT_PAGE: getBooleanEnv("FEATURE_FLAG_CONTACT_PAGE", false),
  ADMIN_EMAIL: getOptionalEnv("ADMIN_EMAIL"),
  ADMIN_PASSWORD: getOptionalEnv("ADMIN_PASSWORD"),
  ADMIN_NAME: getOptionalEnv("ADMIN_NAME"),
};

export { env };
