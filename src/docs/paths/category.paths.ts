import type { PathCollection } from "../types";

export const categoryPaths: PathCollection = {
  "/api/v1/categories": {
    "get": {
      "tags": [
        "Categories"
      ],
      "summary": "List categories",
      "description": "Returns all categories ordered by name.",
      "security": [],
      "responses": {
        "200": {
          "description": "Categories fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CategoryListResponse"
              },
              "examples": {
                "success": {
                  "summary": "Category list",
                  "value": {
                    "data": [
                      {
                        "id": "7c743f91-56b7-4df7-b27f-222222222222",
                        "name": "Engineering",
                        "slug": "engineering",
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
        "Categories"
      ],
      "summary": "Create category",
      "description": "Creates a category. Requires admin authentication.",
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreateCategoryRequest"
            },
            "examples": {
              "createCategory": {
                "summary": "Create category payload",
                "value": {
                  "name": "Engineering",
                  "slug": "engineering"
                }
              }
            }
          }
        }
      },
      "responses": {
        "201": {
          "description": "Category created successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CategoryResponse"
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
  "/api/v1/categories/{id}": {
    "patch": {
      "tags": [
        "Categories"
      ],
      "summary": "Update category",
      "description": "Updates a category by ID. Requires admin authentication.",
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
              "$ref": "#/components/schemas/UpdateCategoryRequest"
            },
            "examples": {
              "updateCategory": {
                "summary": "Update category payload",
                "value": {
                  "name": "Software Engineering",
                  "slug": "software-engineering"
                }
              }
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Category updated successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CategoryResponse"
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
        "Categories"
      ],
      "summary": "Replace category fields",
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
              "$ref": "#/components/schemas/UpdateCategoryRequest"
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Category updated successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CategoryResponse"
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
        "Categories"
      ],
      "summary": "Delete category",
      "description": "Deletes a category by ID. Requires admin authentication.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "responses": {
        "204": {
          "description": "Category deleted successfully."
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
