import { Admin } from "@models/index";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@utils/jwt";
import { hashValue, compareHash } from "@utils/bcrypt";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthenticatedAdminResponse {
  id: string;
  email: string;
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

  public async getMe(adminId: string): Promise<Admin | null> {
    const admin = await Admin.findByPk(adminId, {
      attributes: ["id", "email", "createdAt", "updatedAt"],
    });
    return admin;
  }
}

export default new AuthService();
