import { Admin } from "@models/index";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@utils/jwt";
import { hashValue, compareHash } from "@utils/bcrypt";
import { hashToken, verifyTokenHash } from "@utils/token-hash";
import { ConflictError, ValidationError } from "@errors/http-error";

const MIN_PASSWORD_LENGTH = 12;

const dummyHashPromise = hashValue("timing-equalizer-dummy-password");

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

// GET /me mirrors the login payload: identity plus the author-byline fields
// that post responses embed. The About page no longer reads any of this — its
// content is static in the frontend bundle.
export type AdminProfileResponse = AuthenticatedAdminResponse;

const PROFILE_ATTRIBUTES = [
  "id",
  "email",
  "name",
  "title",
  "bio",
  "avatarUrl",
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

    if (data.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError([
        {
          field: "password",
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        },
      ]);
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
    if (!admin) {
      await compareHash(password, await dummyHashPromise);
      return null;
    }

    const ok = await compareHash(password, admin.passwordHash);
    if (!ok) return null;

    const payload = { sub: admin.id };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    admin.refreshTokenHash = hashToken(refreshToken);
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
      if (payload.type !== "refresh") return null;
      const adminId = payload.sub;
      const admin = await Admin.findByPk(adminId);
      if (!admin || !admin.refreshTokenHash) return null;

      // Any refresh token that is not the current one is rejected, so a stolen
      // token stops working the moment the real client rotates.
      if (!verifyTokenHash(token, admin.refreshTokenHash)) return null;

      const newAccess = signAccessToken({ sub: admin.id });
      const newRefresh = signRefreshToken({ sub: admin.id });
      admin.refreshTokenHash = hashToken(newRefresh);
      await admin.save();
      return { accessToken: newAccess, refreshToken: newRefresh };
    } catch (_error: unknown) {
      return null;
    }
  }

  public async getMe(adminId: string): Promise<AdminProfileResponse | null> {
    const admin = await Admin.findByPk(adminId, {
      attributes: [...PROFILE_ATTRIBUTES],
    });
    if (!admin) return null;
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      title: admin.title ?? null,
      bio: admin.bio ?? null,
      avatarUrl: admin.avatarUrl ?? null,
    };
  }
}

export default new AuthService();
