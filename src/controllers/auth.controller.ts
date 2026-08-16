import { Request, Response, NextFunction } from "express";
import authService from "@services/auth.service";
import {
  ChangePasswordRequest,
  EmptyRequestBody,
  EmptyRequestParams,
  LoginRequest,
} from "@app-types/http.requests";
import { auditContext, recordAudit } from "@utils/audit";

const COOKIE_NAME = "refreshToken";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Browsers silently drop SameSite=None cookies that lack the Secure attribute,
// and Secure can't be satisfied on plain-HTTP local dev — so None is reserved
// for production HTTPS. Locally, Lax suffices: localhost:3000 → localhost:4000
// is same-site (ports are ignored), so the cookie still accompanies fetches.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? ("none" as const) : ("lax" as const),
  path: "/",
};

export async function login(
  req: Request<EmptyRequestParams, unknown, LoginRequest>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    const { ip, userAgent } = auditContext(req);

    if (!result) {
      // No actor: the attempt failed, so there is no authenticated identity to
      // attribute it to. The submitted email is deliberately not recorded.
      await recordAudit({
        action: "auth.login",
        outcome: "failure",
        ip,
        userAgent,
      });
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    await recordAudit({
      action: "auth.login",
      outcome: "success",
      actorId: result.admin.id,
      targetType: "admin",
      targetId: result.admin.id,
      ip,
      userAgent,
    });

    const { accessToken, refreshToken } = result.tokens;

    res.cookie(COOKIE_NAME, refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: { accessToken, admin: result.admin },
    });
  } catch (err) {
    return next(err);
  }
}

export async function logout(
  req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = req.user;
    if (!admin) return res.status(200).json({ success: true });
    await authService.logout(admin.id);

    const { ip, userAgent } = auditContext(req);
    await recordAudit({
      action: "auth.logout",
      outcome: "success",
      actorId: admin.id,
      targetType: "admin",
      targetId: admin.id,
      ip,
      userAgent,
    });

    res.clearCookie(COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(
  req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Missing refresh token" });
    const tokens = await authService.refresh(token);
    if (!tokens)
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });

    res.cookie(COOKIE_NAME, tokens.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    return next(err);
  }
}

export async function me(
  req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = req.user;
    if (!admin)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = await authService.getMe(admin.id);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

export async function changePassword(
  req: Request<EmptyRequestParams, unknown, ChangePasswordRequest>,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = req.user;
    if (!admin)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(admin.id, currentPassword, newPassword);

    const { ip, userAgent } = auditContext(req);
    await recordAudit({
      action: "auth.password_change",
      outcome: "success",
      actorId: admin.id,
      targetType: "admin",
      targetId: admin.id,
      ip,
      userAgent,
    });

    // The password change revoked every refresh token, so the cookie this
    // client still holds is dead. Clear it rather than leave the browser
    // retrying a token that can no longer refresh.
    res.clearCookie(COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export default { login, logout, refresh, me, changePassword };
