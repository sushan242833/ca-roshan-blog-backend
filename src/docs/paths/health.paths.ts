import type { PathCollection } from "../types";

export const healthPaths: PathCollection = {
  "/api/v1/health": {
    "get": {
      "tags": [
        "Health"
      ],
      "summary": "Health check",
      "description": "Confirms the HTTP service is running.",
      "security": [],
      "responses": {
        "200": {
          "description": "Service is healthy.",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "success",
                  "message"
                ],
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Server is running"
                  }
                }
              },
              "examples": {
                "success": {
                  "summary": "Healthy service",
                  "value": {
                    "success": true,
                    "message": "Server is running"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
