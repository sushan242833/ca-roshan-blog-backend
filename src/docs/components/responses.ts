import type { ResponseCollection } from "../types";

export const responses: ResponseCollection = {
  "ValidationError": {
    "description": "Validation error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/ErrorResponse"
        },
        "examples": {
          "requiredField": {
            "summary": "Required field missing",
            "value": {
              "success": false,
              "message": "Validation failed.",
              "error": {
                "code": "VALIDATION_ERROR",
                "details": [
                  {
                    "field": "email",
                    "message": "email must be a valid email address."
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  "UnauthorizedError": {
    "description": "Authentication error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/ErrorResponse"
        },
        "examples": {
          "missingToken": {
            "summary": "Missing or invalid token",
            "value": {
              "success": false,
              "message": "Unauthorized.",
              "error": {
                "code": "UNAUTHORIZED"
              }
            }
          }
        }
      }
    }
  },
  "ForbiddenError": {
    "description": "Forbidden",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/ErrorResponse"
        },
        "examples": {
          "forbidden": {
            "summary": "Authenticated but not allowed",
            "value": {
              "success": false,
              "message": "Forbidden.",
              "error": {
                "code": "FORBIDDEN"
              }
            }
          }
        }
      }
    }
  },
  "NotFoundError": {
    "description": "Resource not found",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/ErrorResponse"
        },
        "examples": {
          "notFound": {
            "summary": "Missing resource",
            "value": {
              "success": false,
              "message": "Post not found.",
              "error": {
                "code": "NOT_FOUND"
              }
            }
          }
        }
      }
    }
  },
  "ConflictError": {
    "description": "Conflict",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/ErrorResponse"
        },
        "examples": {
          "duplicate": {
            "summary": "Duplicate resource",
            "value": {
              "success": false,
              "message": "Email is already subscribed.",
              "error": {
                "code": "CONFLICT"
              }
            }
          }
        }
      }
    }
  },
  "BadRequestError": {
    "description": "Bad request",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/ErrorResponse"
        },
        "examples": {
          "badRequest": {
            "summary": "Invalid request",
            "value": {
              "success": false,
              "message": "No file was uploaded. Expected field name `file`.",
              "error": {
                "code": "BAD_REQUEST"
              }
            }
          }
        }
      }
    }
  },
  "UnsupportedMediaTypeError": {
    "description": "Unsupported media type",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/ErrorResponse"
        },
        "examples": {
          "unsupportedMedia": {
            "summary": "Unsupported upload type",
            "value": {
              "success": false,
              "message": "Invalid file type. Only JPEG, PNG, and WEBP are allowed.",
              "error": {
                "code": "UNSUPPORTED_MEDIA_TYPE"
              }
            }
          }
        }
      }
    }
  },
  "PayloadTooLargeError": {
    "description": "Payload too large",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/ErrorResponse"
        },
        "examples": {
          "fileTooLarge": {
            "summary": "Upload exceeds limit",
            "value": {
              "success": false,
              "message": "File too large. Maximum allowed size is 5MB.",
              "error": {
                "code": "PAYLOAD_TOO_LARGE"
              }
            }
          }
        }
      }
    }
  }
};
