import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export interface Env {
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
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
  RESEND_API_KEY?: string;
  EMAIL_FROM: string;
  NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND: number;
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

const env: Env = {
  PORT: configuredPort,
  NODE_ENV: getEnv("NODE_ENV", "development") as Env["NODE_ENV"],
  DB_HOST: getEnv("DB_HOST"),
  DB_PORT: Number(getEnv("DB_PORT", "5432")),
  DB_NAME: getEnv("DB_NAME"),
  DB_USER: getEnv("DB_USER"),
  DB_PASSWORD: getEnv("DB_PASSWORD"),
  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
  MEDIA_BASE_URL: getEnv("MEDIA_BASE_URL", `http://localhost:${configuredPort}`),
  APP_BASE_URL: appBaseUrl,
  API_BASE_URL: getEnv("API_BASE_URL", appBaseUrl),
  RESEND_API_KEY: getOptionalEnv("RESEND_API_KEY"),
  EMAIL_FROM: getEnv("EMAIL_FROM", "Roshan Blog <onboarding@resend.dev>"),
  NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND: getPositiveNumberEnv(
    "NEWSLETTER_EMAIL_RATE_LIMIT_PER_SECOND",
    "2",
  ),
};

export { env };
