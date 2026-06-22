import type swaggerJSDoc from "swagger-jsdoc";

type SchemaCollection = NonNullable<
  NonNullable<swaggerJSDoc.OAS3Definition["components"]>["schemas"]
>;

export const authSchemas: SchemaCollection = {
  Admin: {
    type: "object",
    required: ["id", "email", "createdAt", "updatedAt"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "8f4a3f77-7d3b-4b2d-9f39-111111111111",
      },
      email: {
        type: "string",
        format: "email",
        example: "admin@roshanblog.com",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2026-06-22T08:15:30.000Z",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        example: "2026-06-22T08:15:30.000Z",
      },
    },
  },
  ErrorResponse: {
    type: "object",
    required: ["success", "message", "error"],
    properties: {
      success: {
        type: "boolean",
        example: false,
      },
      message: {
        type: "string",
        example: "Validation failed.",
      },
      error: {
        type: "object",
        required: ["code"],
        properties: {
          code: {
            type: "string",
            example: "VALIDATION_ERROR",
          },
          details: {
            oneOf: [
              {
                type: "array",
                items: {
                  type: "object",
                  required: ["field", "message"],
                  properties: {
                    field: {
                      type: "string",
                      example: "email",
                    },
                    message: {
                      type: "string",
                      example: "email must be a valid email address.",
                    },
                  },
                },
              },
              {
                type: "object",
                additionalProperties: true,
              },
              {
                type: "array",
                items: {
                  type: "string",
                },
              },
            ],
          },
        },
      },
    },
    example: {
      success: false,
      message: "Validation failed.",
      error: {
        code: "VALIDATION_ERROR",
        details: [
          {
            field: "email",
            message: "email must be a valid email address.",
          },
        ],
      },
    },
  },
  PaginatedResponse: {
    type: "object",
    required: ["items", "pagination"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
        },
      },
      pagination: {
        type: "object",
        required: ["page", "limit", "total", "totalPages"],
        properties: {
          page: {
            type: "integer",
            minimum: 1,
            example: 1,
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            example: 10,
          },
          total: {
            type: "integer",
            minimum: 0,
            example: 42,
          },
          totalPages: {
            type: "integer",
            minimum: 0,
            example: 5,
          },
        },
      },
    },
  },
  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "admin@roshanblog.com",
      },
      password: {
        type: "string",
        format: "password",
        example: "correct-horse-battery-staple",
      },
    },
  },
  LoginResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        required: ["accessToken", "admin"],
        properties: {
          accessToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          admin: {
            $ref: "#/components/schemas/Admin",
          },
        },
      },
    },
    example: {
      success: true,
      data: {
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        admin: {
          id: "8f4a3f77-7d3b-4b2d-9f39-111111111111",
          email: "admin@roshanblog.com",
          createdAt: "2026-06-22T08:15:30.000Z",
          updatedAt: "2026-06-22T08:15:30.000Z",
        },
      },
    },
  },
  RefreshResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        required: ["accessToken"],
        properties: {
          accessToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
    },
    example: {
      success: true,
      data: {
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
    },
  },
  LogoutResponse: {
    type: "object",
    required: ["success"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
    },
    example: {
      success: true,
    },
  },
  CurrentAdminResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        $ref: "#/components/schemas/Admin",
      },
    },
  },
};
