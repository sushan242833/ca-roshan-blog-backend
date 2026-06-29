import { Admin } from "@models/index";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@utils/jwt";
import { hashValue, compareHash } from "@utils/bcrypt";
import { NotFoundError } from "@errors/http-error";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthenticatedAdminResponse {
  id: string;
  email: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

interface LoginResponse {
  admin: AuthenticatedAdminResponse;
  tokens: Tokens;
}

export class AuthService {
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

  public async getMe(adminId: string): Promise<AuthenticatedAdminResponse | null> {
    const admin = await Admin.findByPk(adminId, {
      attributes: ["id", "email", "title", "bio", "avatarUrl", "createdAt", "updatedAt"],
    });
    if (!admin) return null;
    return {
      id: admin.id,
      email: admin.email,
      title: admin.title ?? null,
      bio: admin.bio ?? null,
      avatarUrl: admin.avatarUrl ?? null,
    };
  }

  public async updateProfile(
    adminId: string,
    data: { title?: string | null; bio?: string | null; avatarUrl?: string | null },
  ): Promise<{ id: string; email: string; name: string; title: string | null; bio: string | null; avatarUrl: string | null }> {
    const admin = await Admin.findByPk(adminId);
    if (!admin) throw new NotFoundError("Admin not found.");

    if (typeof data.title !== "undefined") admin.title = data.title;
    if (typeof data.bio !== "undefined") admin.bio = data.bio;
    if (typeof data.avatarUrl !== "undefined") admin.avatarUrl = data.avatarUrl;

    await admin.save();

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      title: admin.title ?? null,
      bio: admin.bio ?? null,
      avatarUrl: admin.avatarUrl ?? null,
    };
  }
}

export default new AuthService();
