import type swaggerJSDoc from "swagger-jsdoc";

type SchemaCollection = NonNullable<
  NonNullable<swaggerJSDoc.OAS3Definition["components"]>["schemas"]
>;

export const categorySchemas: SchemaCollection = {
  Category: {
    type: "object",
    required: ["id", "name", "slug", "createdAt", "updatedAt"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "7c743f91-56b7-4df7-b27f-222222222222",
      },
      name: {
        type: "string",
        example: "Engineering",
      },
      slug: {
        type: "string",
        example: "engineering",
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
  CreateCategoryRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        example: "Engineering",
      },
      slug: {
        type: "string",
        example: "engineering",
      },
    },
  },
  UpdateCategoryRequest: {
    type: "object",
    minProperties: 1,
    properties: {
      name: {
        type: "string",
        example: "Software Engineering",
      },
      slug: {
        type: "string",
        example: "software-engineering",
      },
    },
  },
  CategoryResponse: {
    type: "object",
    required: ["data"],
    properties: {
      data: {
        $ref: "#/components/schemas/Category",
      },
    },
    example: {
      data: {
        id: "7c743f91-56b7-4df7-b27f-222222222222",
        name: "Engineering",
        slug: "engineering",
        createdAt: "2026-06-22T08:15:30.000Z",
        updatedAt: "2026-06-22T08:15:30.000Z",
      },
    },
  },
  CategoryListResponse: {
    type: "object",
    required: ["data"],
    properties: {
      data: {
        type: "array",
        items: {
          $ref: "#/components/schemas/Category",
        },
      },
    },
  },
};
