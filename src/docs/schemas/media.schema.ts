import type swaggerJSDoc from "swagger-jsdoc";

type SchemaCollection = NonNullable<
  NonNullable<swaggerJSDoc.OAS3Definition["components"]>["schemas"]
>;

export const mediaSchemas: SchemaCollection = {
  Media: {
    type: "object",
    required: [
      "id",
      "fileName",
      "originalName",
      "mimeType",
      "kind",
      "size",
      "url",
      "provider",
      "inUse",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "ba038339-5f8e-46fb-961a-333333333333",
      },
      fileName: {
        type: "string",
        example: "ba038339-5f8e-46fb-961a-333333333333.webp",
      },
      originalName: {
        type: "string",
        example: "hero-image.webp",
      },
      mimeType: {
        type: "string",
        enum: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        example: "image/webp",
      },
      kind: {
        type: "string",
        enum: ["image", "document"],
        description: "Derived from the MIME type; PDFs are documents.",
        example: "image",
      },
      size: {
        type: "integer",
        minimum: 1,
        maximum: 20971520,
        description: "Bytes. Images may be up to 5MB, PDFs up to 20MB.",
        example: 184320,
      },
      url: {
        type: "string",
        format: "uri",
        example:
          "http://localhost:4000/uploads/ba038339-5f8e-46fb-961a-333333333333.webp",
      },
      provider: {
        type: "string",
        enum: ["LOCAL", "S3", "CLOUDINARY"],
        example: "LOCAL",
      },
      inUse: {
        type: "boolean",
        description:
          "True when a post (any status, trashed included) or the author profile references this file. Such files cannot be deleted.",
        example: false,
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
  MediaUploadRequest: {
    type: "object",
    required: ["file"],
    properties: {
      file: {
        type: "string",
        format: "binary",
        description:
          "JPEG, PNG, or WEBP image (max 5MB) or a PDF document (max 20MB).",
      },
    },
  },
  MediaResponse: {
    type: "object",
    required: ["success", "message", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Media uploaded successfully.",
      },
      data: {
        $ref: "#/components/schemas/Media",
      },
    },
    example: {
      success: true,
      message: "Media uploaded successfully.",
      data: {
        id: "ba038339-5f8e-46fb-961a-333333333333",
        fileName: "ba038339-5f8e-46fb-961a-333333333333.webp",
        originalName: "hero-image.webp",
        mimeType: "image/webp",
        kind: "image",
        size: 184320,
        url: "http://localhost:4000/uploads/ba038339-5f8e-46fb-961a-333333333333.webp",
        provider: "LOCAL",
        inUse: false,
        createdAt: "2026-06-22T08:15:30.000Z",
        updatedAt: "2026-06-22T08:15:30.000Z",
      },
    },
  },
  MediaListResponse: {
    type: "object",
    required: ["success", "message", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Media list fetched successfully.",
      },
      data: {
        type: "array",
        items: {
          $ref: "#/components/schemas/Media",
        },
      },
    },
  },
  MediaUsage: {
    type: "object",
    required: ["inUse", "posts", "usedByAuthorAvatar"],
    description:
      "Where a media item is referenced. Anything with `inUse: true` cannot be deleted.",
    properties: {
      inUse: {
        type: "boolean",
        example: true,
      },
      posts: {
        type: "array",
        description:
          "Posts referencing the file, in any status. Trashed posts count too, because they can be restored.",
        items: {
          type: "object",
          required: ["postId", "title", "slug", "status", "trashed", "usedAs"],
          properties: {
            postId: {
              type: "string",
              format: "uuid",
              example: "0b1e2f33-4c55-4d66-8e77-999999999999",
            },
            title: {
              type: "string",
              example: "Budget 2026 explained",
            },
            slug: {
              type: "string",
              example: "budget-2026-explained",
            },
            status: {
              type: "string",
              enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
              example: "PUBLISHED",
            },
            trashed: {
              type: "boolean",
              example: false,
            },
            usedAs: {
              type: "array",
              items: {
                type: "string",
                enum: ["featuredImage", "content", "pdf"],
              },
              example: ["featuredImage", "content"],
            },
          },
        },
      },
      usedByAuthorAvatar: {
        type: "boolean",
        description: "The file is the author profile picture.",
        example: false,
      },
    },
  },
  MediaUsageResponse: {
    type: "object",
    required: ["success", "message", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Media usage fetched successfully.",
      },
      data: {
        $ref: "#/components/schemas/MediaUsage",
      },
    },
  },
  DeleteMediaResponse: {
    type: "object",
    required: ["success", "message", "data"],
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Media deleted successfully.",
      },
      data: {
        nullable: true,
        example: null,
      },
    },
  },
};
