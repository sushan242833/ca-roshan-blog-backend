import type { AuthenticatedAdmin } from "./authenticated-admin";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedAdmin;
    }
  }
}

export {};
