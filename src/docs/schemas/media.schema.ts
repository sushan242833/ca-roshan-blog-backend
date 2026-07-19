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
