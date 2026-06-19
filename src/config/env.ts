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
}

function getEnv(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (typeof val === "undefined") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return val as string;
}

const env: Env = {
  PORT: Number(getEnv("PORT", "4000")),
  NODE_ENV: getEnv("NODE_ENV", "development") as Env["NODE_ENV"],
  DB_HOST: getEnv("DB_HOST"),
  DB_PORT: Number(getEnv("DB_PORT", "5432")),
  DB_NAME: getEnv("DB_NAME"),
  DB_USER: getEnv("DB_USER"),
  DB_PASSWORD: getEnv("DB_PASSWORD"),
  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
};

export { env };
