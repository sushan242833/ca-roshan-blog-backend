import type swaggerJSDoc from "swagger-jsdoc";

type SchemaCollection = NonNullable<
  NonNullable<swaggerJSDoc.OAS3Definition["components"]>["schemas"]
>;

export const postSchemas: SchemaCollection = {
  PostStatus: {
    type: "string",
    enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
    example: "PUBLISHED",
  },
  TaxonomyReference: {
    type: "object",
    required: ["id", "name", "slug"],
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
    },
  },
  FeaturedImage: {
    type: "object",
    nullable: true,
    required: ["id", "url", "fileName"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "ba038339-5f8e-46fb-961a-333333333333",
      },
      url: {
        type: "string",
        format: "uri",
        example: "http://localhost:4000/uploads/hero.webp",
      },
      fileName: {
        type: "string",
        example: "hero.webp",
      },
    },
  },
  PostSummary: {
    type: "object",
    required: [
      "id",
      "title",
      "slug",
      "excerpt",
      "status",
      "featured",
      "readingTime",
      "viewCount",
      "metaTitle",
      "metaDescription",
      "publishedAt",
      "createdAt",
      "updatedAt",
      "featuredImage",
      "categories",
      "tags",
    ],
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "5020ddfc-77fa-44c7-9a7a-444444444444",
      },
      title: {
        type: "string",
        example: "Building Production Grade REST APIs",
      },
      slug: {
        type: "string",
        example: "building-production-grade-rest-apis",
      },
      excerpt: {
        type: "string",
        nullable: true,
        example: "A practical guide to reliable API design.",
      },
      status: {
        $ref: "#/components/schemas/PostStatus",
      },
      featured: {
        type: "boolean",
        example: true,
      },
      readingTime: {
        type: "integer",
        minimum: 1,
        example: 6,
      },
      viewCount: {
        type: "integer",
        minimum: 0,
        example: 128,
      },
      metaTitle: {
        type: "string",
        nullable: true,
        example: "Production Grade REST APIs",
      },
      metaDescription: {
        type: "string",
        nullable: true,
        example: "Design and operate reliable Express APIs with TypeScript.",
      },
      publishedAt: {
        type: "string",
        format: "date-time",
        nullable: true,
        example: "2026-06-22T08:30:00.000Z",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2026-06-22T08:15:30.000Z",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        example: "2026-06-22T08:30:00.000Z",
      },
      featuredImage: {
        $ref: "#/components/schemas/FeaturedImage",
      },
      categories: {
        type: "array",
        items: {
          $ref: "#/components/schemas/TaxonomyReference",
        },
      },
      tags: {
        type: "array",
        items: {
          $ref: "#/components/schemas/TaxonomyReference",
        },
      },
    },
  },
  Post: {
    allOf: [
      {
        $ref: "#/components/schemas/PostSummary",
      },
      {
        type: "object",
        required: ["content"],
        properties: {
          content: {
            type: "string",
            example:
              "Use layered boundaries, explicit validation, and clear error responses.",
          },
        },
      },
    ],
    example: {
      id: "5020ddfc-77fa-44c7-9a7a-444444444444",
      title: "Building Production Grade REST APIs",
      slug: "building-production-grade-rest-apis",
      excerpt: "A practical guide to reliable API design.",
      content:
        "Use layered boundaries, explicit validation, and clear error responses.",
      status: "PUBLISHED",
      featured: true,
      readingTime: 6,
      viewCount: 128,
      metaTitle: "Production Grade REST APIs",
      metaDescription: "Design and operate reliable Express APIs with TypeScript.",
      publishedAt: "2026-06-22T08:30:00.000Z",
      createdAt: "2026-06-22T08:15:30.000Z",
      updatedAt: "2026-06-22T08:30:00.000Z",
      featuredImage: {
        id: "ba038339-5f8e-46fb-961a-333333333333",
        url: "http://localhost:4000/uploads/hero.webp",
        fileName: "hero.webp",
      },
      categories: [
        {
          id: "7c743f91-56b7-4df7-b27f-222222222222",
          name: "Engineering",
          slug: "engineering",
        },
      ],
      tags: [
        {
          id: "d8029e7a-36a8-4607-8899-555555555555",
          name: "TypeScript",
          slug: "typescript",
        },
      ],
    },
  },
  CreatePostRequest: {
    type: "object",
    required: ["title", "content"],
    properties: {
      title: {
        type: "string",
        maxLength: 255,
        example: "Building Production Grade REST APIs",
      },
      content: {
        type: "string",
        example:
          "Use layered boundaries, explicit validation, and clear error responses.",
      },
      slug: {
        type: "string",
        example: "building-production-grade-rest-apis",
      },
      excerpt: {
        type: "string",
        nullable: true,
        example: "A practical guide to reliable API design.",
      },
      featuredImageId: {
        type: "string",
        format: "uuid",
        nullable: true,
        example: "ba038339-5f8e-46fb-961a-333333333333",
      },
      metaTitle: {
        type: "string",
        nullable: true,
        maxLength: 60,
        example: "Production Grade REST APIs",
      },
      metaDescription: {
        type: "string",
        nullable: true,
        maxLength: 160,
        example: "Design and operate reliable Express APIs with TypeScript.",
      },
      status: {
        $ref: "#/components/schemas/PostStatus",
      },
      featured: {
        type: "boolean",
        example: true,
      },
      categoryIds: {
        type: "array",
        items: {
          type: "string",
          format: "uuid",
        },
        example: ["7c743f91-56b7-4df7-b27f-222222222222"],
      },
      tagIds: {
        type: "array",
        items: {
          type: "string",
          format: "uuid",
        },
        example: ["d8029e7a-36a8-4607-8899-555555555555"],
      },
      published: {
        type: "boolean",
        example: true,
      },
    },
  },
  UpdatePostRequest: {
    type: "object",
    minProperties: 1,
    properties: {
      title: {
        type: "string",
        maxLength: 255,
        example: "Updated REST API Architecture",
      },
      content: {
        type: "string",
        example: "Updated long-form content.",
      },
      slug: {
        type: "string",
        example: "updated-rest-api-architecture",
      },
      excerpt: {
        type: "string",
        nullable: true,
        example: "Updated summary.",
      },
      featuredImageId: {
        type: "string",
        format: "uuid",
        nullable: true,
        example: "ba038339-5f8e-46fb-961a-333333333333",
      },
      metaTitle: {
        type: "string",
        nullable: true,
        maxLength: 60,
        example: "Updated REST API Architecture",
      },
      metaDescription: {
        type: "string",
        nullable: true,
        maxLength: 160,
        example: "An updated description for search results.",
      },
      status: {
        $ref: "#/components/schemas/PostStatus",
      },
      featured: {
        type: "boolean",
        example: false,
      },
      categoryIds: {
        type: "array",
        items: {
          type: "string",
          format: "uuid",
        },
        example: ["7c743f91-56b7-4df7-b27f-222222222222"],
      },
      tagIds: {
        type: "array",
        items: {
          type: "string",
          format: "uuid",
        },
        example: ["d8029e7a-36a8-4607-8899-555555555555"],
      },
      published: {
        type: "boolean",
        example: false,
      },
    },
  },
  PostResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        $ref: "#/components/schemas/Post",
      },
    },
  },
  PostListResponse: {
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
                  $ref: "#/components/schemas/PostSummary",
                },
              },
            },
          },
        ],
      },
    },
  },
  DeletePostResponse: {
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
};
