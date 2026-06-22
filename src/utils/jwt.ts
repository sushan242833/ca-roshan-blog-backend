import jwt from "jsonwebtoken";
import { env } from "@config/env";

export interface TokenPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: object): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: object): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}

export default {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
