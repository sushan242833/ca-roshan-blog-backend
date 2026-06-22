import type swaggerJSDoc from "swagger-jsdoc";

type SchemaCollection = NonNullable<
  NonNullable<swaggerJSDoc.OAS3Definition["components"]>["schemas"]
>;

export const newsletterSchemas: SchemaCollection = {
  SubscriberStatus: {
    type: "string",
    enum: ["PENDING", "ACTIVE", "UNSUBSCRIBED"],
    example: "ACTIVE",
  },
  Subscriber: {
    type: "object",
    required: ["id", "email", "status", "verifiedAt", "createdAt", "updatedAt"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "ac3f2167-2a6f-451d-a1a6-666666666666",
      },
      email: {
        type: "string",
        format: "email",
        example: "reader@example.com",
      },
      status: {
        $ref: "#/components/schemas/SubscriberStatus",
      },
      verifiedAt: {
        type: "string",
        format: "date-time",
        nullable: true,
        example: "2026-06-22T08:20:30.000Z",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2026-06-22T08:15:30.000Z",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        example: "2026-06-22T08:20:30.000Z",
      },
    },
  },
  SubscribeRequest: {
    type: "object",
    required: ["email"],
    properties: {
      email: {
        type: "string",
        format: "email",
        maxLength: 320,
        example: "reader@example.com",
      },
    },
  },
  SubscriberResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        $ref: "#/components/schemas/Subscriber",
      },
    },
    example: {
      success: true,
      data: {
        id: "ac3f2167-2a6f-451d-a1a6-666666666666",
        email: "reader@example.com",
        status: "PENDING",
        verifiedAt: null,
        createdAt: "2026-06-22T08:15:30.000Z",
        updatedAt: "2026-06-22T08:15:30.000Z",
      },
    },
  },
  SubscriberListResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        allOf: [
          {
            $ref: "#/components/schemas/PaginatedResponse",
          },
          {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/Subscriber",
                },
              },
            },
          },
        ],
      },
    },
  },
  SubscriberStats: {
    type: "object",
    required: ["total", "pending", "active", "unsubscribed"],
    properties: {
      total: {
        type: "integer",
        minimum: 0,
        example: 128,
      },
      pending: {
        type: "integer",
        minimum: 0,
        example: 12,
      },
      active: {
        type: "integer",
        minimum: 0,
        example: 108,
      },
      unsubscribed: {
        type: "integer",
        minimum: 0,
        example: 8,
      },
    },
  },
  SubscriberStatsResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        $ref: "#/components/schemas/SubscriberStats",
      },
    },
  },
};
