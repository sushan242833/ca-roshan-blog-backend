import type { Admin } from "@models/admin.model";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string } | Admin;
    }
  }
}

export {};
