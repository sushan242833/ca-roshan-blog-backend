import type { PathCollection } from "../types";

export const mediaPaths: PathCollection = {
  "/api/v1/media/upload": {
    "post": {
      "tags": [
        "Media"
      ],
      "summary": "Upload media",
      "description": "Uploads one image file. Supports JPEG, PNG, and WEBP up to 5MB. Requires admin authentication.",
      "requestBody": {
        "required": true,
        "content": {
          "multipart/form-data": {
            "schema": {
              "$ref": "#/components/schemas/MediaUploadRequest"
            },
            "encoding": {
              "file": {
                "contentType": "image/jpeg, image/png, image/webp"
              }
            }
          }
        }
      },
      "responses": {
        "201": {
          "description": "Media uploaded successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/MediaResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/BadRequestError"
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "413": {
          "$ref": "#/components/responses/PayloadTooLargeError"
        },
        "415": {
          "$ref": "#/components/responses/UnsupportedMediaTypeError"
        }
      }
    }
  },
  "/api/v1/media": {
    "get": {
      "tags": [
        "Media"
      ],
      "summary": "List media",
      "description": "Returns all media records.",
      "security": [],
      "responses": {
        "200": {
          "description": "Media list fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/MediaListResponse"
              }
            }
          }
        }
      }
    }
  },
  "/api/v1/media/{id}": {
    "get": {
      "tags": [
        "Media"
      ],
      "summary": "Get media by ID",
      "description": "Returns a single media record by ID.",
      "security": [],
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Media fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/MediaResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/BadRequestError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    },
    "delete": {
      "tags": [
        "Media"
      ],
      "summary": "Delete media",
      "description": "Deletes a media record and its stored file. Requires admin authentication.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Media deleted successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeleteMediaResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/BadRequestError"
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    }
  }
};
