import jwt from "jsonwebtoken";
import { env } from "@config/env";

const ALGORITHM = "HS256" as const;

export type TokenType = "access" | "refresh";

export interface TokenPayload {
  sub: string;
  type?: TokenType;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: { sub: string }): string {
  return jwt.sign({ ...payload, type: "access" }, env.JWT_SECRET, {
    expiresIn: "15m",
    algorithm: ALGORITHM,
  });
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
    algorithm: ALGORITHM,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: [ALGORITHM],
  }) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: [ALGORITHM],
  }) as TokenPayload;
}

export default {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
