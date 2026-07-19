import { Request, Response, NextFunction } from "express";
import authService from "@services/auth.service";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  LoginRequest,
} from "@app-types/http.requests";

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
    if (!result)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

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
      name,
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
      name?: string;
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
      name,
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
