import { Request, Response, NextFunction } from "express";
import authService from "@services/auth.service";

const COOKIE_NAME = "refreshToken";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password);
    if (!result)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    const { accessToken, refreshToken } = result.tokens;

    res.cookie(COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      success: true,
      data: { accessToken, admin: result.admin },
    });
  } catch (err) {
    return next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = (req as any).user;
    if (!admin) return res.status(200).json({ success: true });
    await authService.logout(admin.id);
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
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
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    return next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = (req as any).user;
    if (!admin)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = await authService.getMe(admin.id);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

export default { login, logout, refresh, me };
