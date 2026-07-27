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
  // Single connection URL from a managed Postgres provider. When set it wins
  // over the discrete DB_* fields below.
  DATABASE_URL?: string;
  DB_SSL_CA?: string;
  // TLS to the database. Defaults to on whenever DATABASE_URL is set (every
  // managed provider requires it) or in production/staging. Set DB_SSL=false
  // only when pointing DATABASE_URL at a plaintext local Postgres.
  DB_SSL: boolean;
  DB_POOL_MAX: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  MEDIA_BASE_URL: string;
  // "local" writes to ./uploads (dev only; container filesystems are
  // ephemeral). "cloudinary" requires the three CLOUDINARY_* values.
  MEDIA_STORAGE_DRIVER: "local" | "cloudinary";
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_FOLDER: string;
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

const WEAK_SECRETS = new Set([
  "your-super-secret-key",
  "another-super-secret-key",
  "test_jwt_secret",
  "test_jwt_refresh_secret",
  "changeme",
  "secret",
]);

function getStrongSecret(name: string, nodeEnv: Env["NODE_ENV"]): string {
  const isTest = nodeEnv === "test";
  const value = getEnv(name, isTest ? `test_${name.toLowerCase()}` : undefined);

  if (nodeEnv === "production" || nodeEnv === "staging") {
    if (value.length < 32 || WEAK_SECRETS.has(value)) {
      throw new Error(
        `${name} must be a strong, random value of at least 32 characters. ` +
          "Generate one with `openssl rand -base64 48`.",
      );
    }
  }

  return value;
}

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

const databaseUrl = getOptionalEnv("DATABASE_URL");

// With DATABASE_URL supplying host/user/password/database, the discrete DB_*
// variables become optional. Without it they stay mandatory, so a
// misconfigured deploy still fails fast at boot rather than at first query.
function getDatabaseField(name: string, fallback: string): string {
  if (databaseUrl) {
    return getEnv(name, fallback);
  }
  return getEnv(name, isTestEnvironment ? fallback : undefined);
}

function getMediaStorageDriver(
  nodeEnv: Env["NODE_ENV"],
): Env["MEDIA_STORAGE_DRIVER"] {
  const raw = getOptionalEnv("MEDIA_STORAGE_DRIVER")?.toLowerCase();
  const driver =
    raw === "cloudinary" || raw === "local"
      ? raw
      : nodeEnv === "production" || nodeEnv === "staging"
        ? "cloudinary"
        : "local";

  if (driver === "cloudinary") {
    // Fail at boot, not on the first upload. A silent fallback to local disk
    // in production would drop every image on the next deploy.
    for (const name of [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ]) {
      if (!getOptionalEnv(name)) {
        throw new Error(
          `${name} is required when MEDIA_STORAGE_DRIVER is "cloudinary".`,
        );
      }
    }
  }

  return driver;
}

const env: Env = {
  PORT: configuredPort,
  NODE_ENV: resolvedNodeEnv,
  TRUST_PROXY: getTrustProxyEnv(resolvedNodeEnv),
  DATABASE_URL: databaseUrl,
  DB_SSL_CA: getOptionalEnv("DB_SSL_CA"),
  DB_SSL: getBooleanEnv(
    "DB_SSL",
    Boolean(databaseUrl) ||
      resolvedNodeEnv === "production" ||
      resolvedNodeEnv === "staging",
  ),
  DB_POOL_MAX: getPositiveNumberEnv("DB_POOL_MAX", "10"),
  DB_HOST: getDatabaseField("DB_HOST", "localhost"),
  DB_PORT: Number(getEnv("DB_PORT", "5432")),
  DB_NAME: isTestEnvironment
    ? testDatabaseName
    : databaseUrl
      ? getEnv("DB_NAME", "")
      : getEnv("DB_NAME"),
  DB_USER: getDatabaseField("DB_USER", getEnv("USER", "postgres")),
  DB_PASSWORD: getDatabaseField("DB_PASSWORD", ""),
  JWT_SECRET: getStrongSecret("JWT_SECRET", resolvedNodeEnv),
  JWT_REFRESH_SECRET: getStrongSecret("JWT_REFRESH_SECRET", resolvedNodeEnv),
  MEDIA_BASE_URL: getEnv(
    "MEDIA_BASE_URL",
    `http://localhost:${configuredPort}`,
  ),
  MEDIA_STORAGE_DRIVER: getMediaStorageDriver(resolvedNodeEnv),
  CLOUDINARY_CLOUD_NAME: getOptionalEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: getOptionalEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: getOptionalEnv("CLOUDINARY_API_SECRET"),
  CLOUDINARY_FOLDER: getEnv("CLOUDINARY_FOLDER", "ca-roshan-blog"),
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
