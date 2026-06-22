import type { SecuritySchemeCollection } from "../types";

export const securitySchemes: SecuritySchemeCollection = {
  "bearerAuth": {
    "type": "http",
    "scheme": "bearer",
    "bearerFormat": "JWT"
  }
};

export const bearerAuthSecurity = {
  bearerAuth: [],
};
