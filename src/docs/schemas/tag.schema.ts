import type swaggerJSDoc from "swagger-jsdoc";

type SchemaCollection = NonNullable<
  NonNullable<swaggerJSDoc.OAS3Definition["components"]>["schemas"]
>;

export const tagSchemas: SchemaCollection = {
  Tag: {
    type: "object",
    required: ["id", "name", "slug", "createdAt", "updatedAt"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "d8029e7a-36a8-4607-8899-555555555555",
      },
      name: {
        type: "string",
        example: "TypeScript",
      },
      slug: {
        type: "string",
        example: "typescript",
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
  CreateTagRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        example: "TypeScript",
      },
      slug: {
        type: "string",
        example: "typescript",
      },
    },
  },
  UpdateTagRequest: {
    type: "object",
    minProperties: 1,
    properties: {
      name: {
        type: "string",
        example: "Node.js",
      },
      slug: {
        type: "string",
        example: "nodejs",
      },
    },
  },
  TagResponse: {
    type: "object",
    required: ["data"],
    properties: {
      data: {
        $ref: "#/components/schemas/Tag",
      },
    },
    example: {
      data: {
        id: "d8029e7a-36a8-4607-8899-555555555555",
        name: "TypeScript",
        slug: "typescript",
        createdAt: "2026-06-22T08:15:30.000Z",
        updatedAt: "2026-06-22T08:15:30.000Z",
      },
    },
  },
  TagListResponse: {
    type: "object",
    required: ["data"],
    properties: {
      data: {
        type: "array",
        items: {
          $ref: "#/components/schemas/Tag",
        },
      },
    },
  },
};
