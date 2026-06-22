import type { PathCollection } from "../types";

export const tagPaths: PathCollection = {
  "/api/v1/tags": {
    "get": {
      "tags": [
        "Tags"
      ],
      "summary": "List tags",
      "description": "Returns all tags ordered by name.",
      "security": [],
      "responses": {
        "200": {
          "description": "Tags fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/TagListResponse"
              },
              "examples": {
                "success": {
                  "summary": "Tag list",
                  "value": {
                    "data": [
                      {
                        "id": "d8029e7a-36a8-4607-8899-555555555555",
                        "name": "TypeScript",
                        "slug": "typescript",
                        "createdAt": "2026-06-22T08:15:30.000Z",
                        "updatedAt": "2026-06-22T08:15:30.000Z"
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    "post": {
      "tags": [
        "Tags"
      ],
      "summary": "Create tag",
      "description": "Creates a tag. Requires admin authentication.",
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreateTagRequest"
            },
            "examples": {
              "createTag": {
                "summary": "Create tag payload",
                "value": {
                  "name": "TypeScript",
                  "slug": "typescript"
                }
              }
            }
          }
        }
      },
      "responses": {
        "201": {
          "description": "Tag created successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/TagResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "409": {
          "$ref": "#/components/responses/ConflictError"
        }
      }
    }
  },
  "/api/v1/tags/{id}": {
    "patch": {
      "tags": [
        "Tags"
      ],
      "summary": "Update tag",
      "description": "Updates a tag by ID. Requires admin authentication.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/UpdateTagRequest"
            },
            "examples": {
              "updateTag": {
                "summary": "Update tag payload",
                "value": {
                  "name": "Node.js",
                  "slug": "nodejs"
                }
              }
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Tag updated successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/TagResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        },
        "409": {
          "$ref": "#/components/responses/ConflictError"
        }
      }
    },
    "put": {
      "tags": [
        "Tags"
      ],
      "summary": "Replace tag fields",
      "description": "Backward-compatible update endpoint using the same payload as PATCH.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/UpdateTagRequest"
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Tag updated successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/TagResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        },
        "409": {
          "$ref": "#/components/responses/ConflictError"
        }
      }
    },
    "delete": {
      "tags": [
        "Tags"
      ],
      "summary": "Delete tag",
      "description": "Deletes a tag by ID. Requires admin authentication.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "responses": {
        "204": {
          "description": "Tag deleted successfully."
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
