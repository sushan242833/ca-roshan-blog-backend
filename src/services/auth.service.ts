import { Admin } from "@models/index";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@utils/jwt";
import { hashValue, compareHash } from "@utils/bcrypt";
import { ConflictError, NotFoundError } from "@errors/http-error";
import { AboutPageResponse, toAboutPageResponse } from "@dto/about-page.dto";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthenticatedAdminResponse {
  id: string;
  name: string;
  email: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

interface LoginResponse {
  admin: AuthenticatedAdminResponse;
  tokens: Tokens;
}

export interface AdminProfileResponse extends AboutPageResponse {
  id: string;
  email: string;
}

export interface UpdateProfileData {
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
}

const ABOUT_PAGE_ATTRIBUTES = [
  "name",
  "title",
  "avatarUrl",
  "location",
  "yearsOfExperience",
  "qualification",
  "bio",
  "bioParagraph2",
  "professionalQuote",
  "expertise",
  "closingMessage",
  "seoTitle",
  "seoDescription",
  "ogImageUrl",
] as const;

export class AuthService {
  /**
   * Creates the one and only admin account.
   * Throws ConflictError if an admin already exists.
   * This method must be the sole entry point for admin
   * creation across the entire application.
   */
  public async createAdmin(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<void> {
    const existing = await Admin.findOne();
    if (existing) {
      throw new ConflictError(
        "An admin account already exists. " +
          "This platform supports only one admin.",
      );
    }

    const passwordHash = await hashValue(data.password);
    await Admin.create({
      name: data.name,
      email: data.email,
      passwordHash,
      isActive: true,
    });
  }

  public async login(
    email: string,
    password: string,
  ): Promise<LoginResponse | null> {
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) return null;

    const ok = await compareHash(password, admin.passwordHash);
    if (!ok) return null;

    const payload = { sub: admin.id };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const refreshTokenHash = await hashValue(refreshToken);
    admin.refreshTokenHash = refreshTokenHash;
    await admin.save();

    const safeAdmin: AuthenticatedAdminResponse = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      title: admin.title ?? null,
      bio: admin.bio ?? null,
      avatarUrl: admin.avatarUrl ?? null,
    };
    return { admin: safeAdmin, tokens: { accessToken, refreshToken } };
  }

  public async logout(adminId: string): Promise<void> {
    const admin = await Admin.findByPk(adminId);
    if (!admin) return;
    admin.refreshTokenHash = null;
    await admin.save();
  }

  public async refresh(token: string): Promise<Tokens | null> {
    try {
      const payload = verifyRefreshToken(token);
      const adminId = payload.sub;
      const admin = await Admin.findByPk(adminId);
      if (!admin || !admin.refreshTokenHash) return null;

      const match = await compareHash(token, admin.refreshTokenHash);
      if (!match) return null;

      const newAccess = signAccessToken({ sub: admin.id });
      const newRefresh = signRefreshToken({ sub: admin.id });
      admin.refreshTokenHash = await hashValue(newRefresh);
      await admin.save();
      return { accessToken: newAccess, refreshToken: newRefresh };
    } catch (_error: unknown) {
      return null;
    }
  }

  public async getMe(adminId: string): Promise<AdminProfileResponse | null> {
    const admin = await Admin.findByPk(adminId, {
      attributes: [...ABOUT_PAGE_ATTRIBUTES, "id", "email"],
    });
    if (!admin) return null;
    return {
      ...toAboutPageResponse(admin),
      id: admin.id,
      email: admin.email,
    };
  }

  public async updateProfile(
    adminId: string,
    data: UpdateProfileData,
  ): Promise<AboutPageResponse> {
    const admin = await Admin.findByPk(adminId);
    if (!admin) throw new NotFoundError("Admin not found.");

    if (typeof data.title !== "undefined") admin.title = data.title;
    if (typeof data.bio !== "undefined") admin.bio = data.bio;
    if (typeof data.avatarUrl !== "undefined") admin.avatarUrl = data.avatarUrl;
    if (typeof data.location !== "undefined") admin.location = data.location;
    if (typeof data.yearsOfExperience !== "undefined")
      admin.yearsOfExperience = data.yearsOfExperience;
    if (typeof data.qualification !== "undefined")
      admin.qualification = data.qualification;
    if (typeof data.bioParagraph2 !== "undefined")
      admin.bioParagraph2 = data.bioParagraph2;
    if (typeof data.professionalQuote !== "undefined")
      admin.professionalQuote = data.professionalQuote;
    if (typeof data.expertise !== "undefined") admin.expertise = data.expertise;
    if (typeof data.closingMessage !== "undefined")
      admin.closingMessage = data.closingMessage;
    if (typeof data.seoTitle !== "undefined") admin.seoTitle = data.seoTitle;
    if (typeof data.seoDescription !== "undefined")
      admin.seoDescription = data.seoDescription;
    if (typeof data.ogImageUrl !== "undefined") admin.ogImageUrl = data.ogImageUrl;

    await admin.save();

    return toAboutPageResponse(admin);
  }

  /**
   * Public about-page content. A personal blog has exactly one admin,
   * so this returns that admin's profile with no auth required.
   */
  public async getAboutPage(): Promise<AboutPageResponse | null> {
    const admin = await Admin.findOne({
      attributes: [...ABOUT_PAGE_ATTRIBUTES],
    });
    if (!admin) return null;
    return toAboutPageResponse(admin);
  }
}

export default new AuthService();
