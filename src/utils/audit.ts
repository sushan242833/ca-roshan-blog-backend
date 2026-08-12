import { Request } from "express";
import { AuditLog } from "@models/audit-log.model";

// The closed set of audited actions. A union rather than free-form strings so
// a typo becomes a compile error instead of an entry nobody ever queries for.
export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.password_change"
  | "post.delete"
  | "post.publish"
  | "post.preview_token"
  | "media.delete"
  | "subscribers.export";

export type AuditOutcome = "success" | "failure";

export interface AuditEntry {
  action: AuditAction;
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  outcome: AuditOutcome;
}

// Column widths from migration 026. Values are clamped rather than left to the
// database, because an over-long User-Agent would otherwise turn into a write
// error and the entry would be dropped entirely.
const MAX_IP_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 255;
const MAX_TARGET_ID_LENGTH = 64;

function clamp(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

/**
 * Pulls the request-scoped fields every audited action shares. `req.ip` honours
 * the configured `trust proxy` hop count, so it is the real client address
 * rather than the proxy's.
 *
 * Deliberately reads nothing from the body, the Authorization header or the
 * refresh cookie — no credential, token or token hash may reach an audit row.
 */
export function auditContext(req: Request): {
  ip: string | null;
  userAgent: string | null;
} {
  return {
    ip: clamp(req.ip, MAX_IP_LENGTH),
    userAgent: clamp(req.get("user-agent"), MAX_USER_AGENT_LENGTH),
  };
}

/**
 * Writes one audit row. Never throws and never rejects: an audit failure must
 * not turn a successful delete or login into a 500, so the error is logged and
 * swallowed. Callers can safely `await` this on the request path.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({
      action: entry.action,
      actorId: entry.actorId ?? null,
      targetType: entry.targetType ?? null,
      targetId: clamp(entry.targetId, MAX_TARGET_ID_LENGTH),
      ip: clamp(entry.ip, MAX_IP_LENGTH),
      userAgent: clamp(entry.userAgent, MAX_USER_AGENT_LENGTH),
      outcome: entry.outcome,
    });
  } catch (error: unknown) {
    console.error("audit write failed", error);
  }
}

export default recordAudit;
