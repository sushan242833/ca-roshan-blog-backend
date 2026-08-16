import { NextFunction, Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { TokenPayload, verifyAccessToken } from "@utils/jwt";
import { Admin } from "@models/index";
import { AuthenticatedAdmin } from "@app-types/authenticated-admin";

const ADMIN_ROLE = "admin";

function isIssuedBeforeCutoff(
  payload: TokenPayload,
  cutoff: Date | null | undefined,
): boolean {
  if (!cutoff) return false;
  // No `iat` means the token cannot be shown to postdate the cut-off, so it
  // fails closed. jsonwebtoken always sets the claim.
  if (typeof payload.iat !== "number") return true;
  return payload.iat < Math.floor(cutoff.getTime() / 1000);
}

export const authMiddleware = async (
  req: Request<ParamsDictionary, unknown, unknown>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers["authorization"];
    if (!header)
      return res
        .status(401)
        .json({ success: false, message: "Missing Authorization header" });
    const parts = (header as string).split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      return res
        .status(401)
        .json({ success: false, message: "Invalid Authorization header" });
    const token = parts[1];
    const payload = verifyAccessToken(token);
    if (payload.type !== "access")
      return res.status(401).json({ success: false, message: "Invalid token" });
    const admin = await Admin.findByPk(payload.sub, {
      attributes: ["id", "email", "isActive", "sessionsInvalidatedAt"],
    });
    if (!admin || !admin.isActive)
      return res.status(401).json({ success: false, message: "Invalid token" });
    if (isIssuedBeforeCutoff(payload, admin.sessionsInvalidatedAt))
      return res.status(401).json({ success: false, message: "Invalid token" });
    const authenticatedAdmin: AuthenticatedAdmin = {
      id: admin.id,
      email: admin.email,
      role: ADMIN_ROLE,
    };
    req.user = authenticatedAdmin;
    return next();
  } catch (_error: unknown) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

export default authMiddleware;
