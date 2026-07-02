import { Request, Response, NextFunction } from "express";
import authService from "@services/auth.service";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  LoginRequest,
} from "@app-types/http.requests";

const COOKIE_NAME = "refreshToken";

export async function login(
  req: Request<EmptyRequestParams, unknown, LoginRequest>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = req.body;
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

export async function logout(
  req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = req.user;
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

export async function updateProfile(
  req: Request<EmptyRequestParams, unknown, unknown>,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = req.user;
    if (!admin)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const {
      title,
      bio,
      avatarUrl,
      location,
      yearsOfExperience,
      qualification,
      bioParagraph2,
      professionalQuote,
      expertise,
      closingMessage,
      seoTitle,
      seoDescription,
      ogImageUrl,
    } = req.body as {
      title?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
      location?: string | null;
      yearsOfExperience?: string | null;
      qualification?: string | null;
      bioParagraph2?: string | null;
      professionalQuote?: string | null;
      expertise?: string | null;
      closingMessage?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      ogImageUrl?: string | null;
    };

    const updated = await authService.updateProfile(admin.id, {
      title,
      bio,
      avatarUrl,
      location,
      yearsOfExperience,
      qualification,
      bioParagraph2,
      professionalQuote,
      expertise,
      closingMessage,
      seoTitle,
      seoDescription,
      ogImageUrl,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
}

export async function getAboutPage(
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await authService.getAboutPage();
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "About page not configured." });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

export default { login, logout, refresh, me, updateProfile, getAboutPage };
