import type { PathCollection } from "../types";

export const authPaths: PathCollection = {
  "/api/v1/auth/login": {
    "post": {
      "tags": [
        "Auth"
      ],
      "summary": "Admin login",
      "description": "Authenticates an admin and sets the refresh token as an HTTP-only cookie.",
      "security": [],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/LoginRequest"
            },
            "examples": {
              "adminLogin": {
                "summary": "Login credentials",
                "value": {
                  "email": "admin@roshanblog.com",
                  "password": "correct-horse-battery-staple"
                }
              }
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Login successful.",
          "headers": {
            "Set-Cookie": {
              "description": "HTTP-only refresh token cookie.",
              "schema": {
                "type": "string",
                "example": "refreshToken=token; Path=/; HttpOnly; SameSite=Strict"
              }
            }
          },
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "401": {
          "description": "Invalid credentials.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ErrorResponse"
              },
              "examples": {
                "invalidCredentials": {
                  "summary": "Invalid credentials",
                  "value": {
                    "success": false,
                    "message": "Invalid credentials"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "/api/v1/auth/logout": {
    "post": {
      "tags": [
        "Auth"
      ],
      "summary": "Admin logout",
      "description": "Revokes the current refresh token and clears the refresh token cookie.",
      "responses": {
        "200": {
          "description": "Logout successful.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LogoutResponse"
              }
            }
          }
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        }
      }
    }
  },
  "/api/v1/auth/refresh": {
    "post": {
      "tags": [
        "Auth"
      ],
      "summary": "Refresh access token",
      "description": "Uses the HTTP-only refresh token cookie to issue a new access token.",
      "security": [],
      "responses": {
        "200": {
          "description": "Access token refreshed successfully.",
          "headers": {
            "Set-Cookie": {
              "description": "Rotated HTTP-only refresh token cookie.",
              "schema": {
                "type": "string",
                "example": "refreshToken=token; Path=/; HttpOnly; SameSite=Strict"
              }
            }
          },
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RefreshResponse"
              }
            }
          }
        },
        "401": {
          "description": "Missing, invalid, or expired refresh token.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ErrorResponse"
              },
              "examples": {
                "missingRefreshToken": {
                  "summary": "Missing refresh token",
                  "value": {
                    "success": false,
                    "message": "Missing refresh token"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "/api/v1/auth/me": {
    "get": {
      "tags": [
        "Auth"
      ],
      "summary": "Get current admin",
      "description": "Returns the authenticated admin profile.",
      "responses": {
        "200": {
          "description": "Current admin fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CurrentAdminResponse"
              }
            }
          }
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        }
      }
    }
  }
};
