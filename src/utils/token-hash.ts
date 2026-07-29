import crypto from "crypto";

// Refresh tokens are hashed with SHA-256 rather than bcrypt. bcrypt silently
// truncates its input at 72 bytes, and a refresh JWT is ~211 bytes, so the
// signature, `type`, `iat` and `exp` claims all fell outside the hashed region.
// The practical effect was that rotation did not invalidate an older token:
// every refresh token issued for the same admin shared the same first 72 bytes
// and therefore matched the stored hash.
//
// A password needs bcrypt's deliberate slowness because it is low entropy. A
// signed JWT is already high entropy, so a single fast digest is both correct
// and cheaper.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

// Constant-time comparison so the stored hash cannot be recovered byte by byte
// through response-timing measurement.
export function verifyTokenHash(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashToken(token), "hex");
  let expected: Buffer;
  try {
    expected = Buffer.from(storedHash, "hex");
  } catch {
    return false;
  }

  if (candidate.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidate, expected);
}

export default { hashToken, verifyTokenHash };
