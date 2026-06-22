import type { PathCollection } from "../types";

export const postPaths: PathCollection = {
  "/api/v1/posts": {
    "get": {
      "tags": [
        "Posts"
      ],
      "summary": "List published posts",
      "description": "Returns published posts with pagination and optional filters.",
      "security": [],
      "parameters": [
        {
          "$ref": "#/components/parameters/PageQueryParam"
        },
        {
          "$ref": "#/components/parameters/LimitQueryParam"
        },
        {
          "in": "query",
          "name": "search",
          "required": false,
          "schema": {
            "type": "string"
          },
          "example": "express"
        },
        {
          "in": "query",
          "name": "q",
          "required": false,
          "schema": {
            "type": "string"
          },
          "example": "express"
        },
        {
          "in": "query",
          "name": "category",
          "required": false,
          "schema": {
            "type": "string"
          },
          "example": "engineering"
        },
        {
          "in": "query",
          "name": "tag",
          "required": false,
          "schema": {
            "type": "string"
          },
          "example": "typescript"
        },
        {
          "in": "query",
          "name": "featured",
          "required": false,
          "schema": {
            "type": "boolean"
          },
          "example": true
        }
      ],
      "responses": {
        "200": {
          "description": "Published posts fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostListResponse"
              },
              "examples": {
                "success": {
                  "summary": "Paginated posts",
                  "value": {
                    "success": true,
                    "data": {
                      "items": [
                        {
                          "id": "5020ddfc-77fa-44c7-9a7a-444444444444",
                          "title": "Building Production Grade REST APIs",
                          "slug": "building-production-grade-rest-apis",
                          "excerpt": "A practical guide to reliable API design.",
                          "status": "PUBLISHED",
                          "featured": true,
                          "readingTime": 6,
                          "viewCount": 128,
                          "metaTitle": "Production Grade REST APIs",
                          "metaDescription": "Design and operate reliable Express APIs with TypeScript.",
                          "publishedAt": "2026-06-22T08:30:00.000Z",
                          "createdAt": "2026-06-22T08:15:30.000Z",
                          "updatedAt": "2026-06-22T08:30:00.000Z",
                          "featuredImage": null,
                          "categories": [],
                          "tags": []
                        }
                      ],
                      "pagination": {
                        "page": 1,
                        "limit": 10,
                        "total": 1,
                        "totalPages": 1
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        }
      }
    },
    "post": {
      "tags": [
        "Posts"
      ],
      "summary": "Create post",
      "description": "Creates a blog post. Requires admin authentication.",
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreatePostRequest"
            },
            "examples": {
              "createPost": {
                "summary": "Create post payload",
                "value": {
                  "title": "Building Production Grade REST APIs",
                  "content": "Use layered boundaries, explicit validation, and clear error responses.",
                  "excerpt": "A practical guide to reliable API design.",
                  "status": "PUBLISHED",
                  "featured": true,
                  "categoryIds": [
                    "7c743f91-56b7-4df7-b27f-222222222222"
                  ],
                  "tagIds": [
                    "d8029e7a-36a8-4607-8899-555555555555"
                  ]
                }
              }
            }
          }
        }
      },
      "responses": {
        "201": {
          "description": "Post created successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        }
      }
    }
  },
  "/api/v1/posts/featured": {
    "get": {
      "tags": [
        "Posts"
      ],
      "summary": "List featured posts",
      "description": "Returns published posts marked as featured.",
      "security": [],
      "parameters": [
        {
          "$ref": "#/components/parameters/PageQueryParam"
        },
        {
          "$ref": "#/components/parameters/LimitQueryParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Featured posts fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostListResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        }
      }
    }
  },
  "/api/v1/posts/admin/list": {
    "get": {
      "tags": [
        "Posts"
      ],
      "summary": "Admin post list",
      "description": "Returns posts for admins, including drafts and optionally soft-deleted posts.",
      "parameters": [
        {
          "$ref": "#/components/parameters/PageQueryParam"
        },
        {
          "$ref": "#/components/parameters/LimitQueryParam"
        },
        {
          "in": "query",
          "name": "search",
          "required": false,
          "schema": {
            "type": "string"
          },
          "example": "architecture"
        },
        {
          "in": "query",
          "name": "q",
          "required": false,
          "schema": {
            "type": "string"
          },
          "example": "architecture"
        },
        {
          "in": "query",
          "name": "includeDeleted",
          "required": false,
          "schema": {
            "type": "boolean",
            "default": false
          },
          "example": false
        }
      ],
      "responses": {
        "200": {
          "description": "Admin posts fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostListResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        }
      }
    }
  },
  "/api/v1/posts/{id}": {
    "patch": {
      "tags": [
        "Posts"
      ],
      "summary": "Update post",
      "description": "Partially updates a post by ID. Requires admin authentication.",
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
              "$ref": "#/components/schemas/UpdatePostRequest"
            },
            "examples": {
              "updatePost": {
                "summary": "Update post payload",
                "value": {
                  "title": "Updated REST API Architecture",
                  "featured": false,
                  "status": "DRAFT"
                }
              }
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Post updated successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostResponse"
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
        }
      }
    },
    "put": {
      "tags": [
        "Posts"
      ],
      "summary": "Replace post fields",
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
              "$ref": "#/components/schemas/UpdatePostRequest"
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Post updated successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostResponse"
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
        }
      }
    },
    "delete": {
      "tags": [
        "Posts"
      ],
      "summary": "Delete post",
      "description": "Soft-deletes a post by ID. Requires admin authentication.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Post deleted successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeletePostResponse"
              }
            }
          }
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    }
  },
  "/api/v1/posts/{id}/publish": {
    "post": {
      "tags": [
        "Posts"
      ],
      "summary": "Publish post",
      "description": "Publishes a draft post. Requires admin authentication.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Post published successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostResponse"
              }
            }
          }
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    }
  },
  "/api/v1/posts/{id}/archive": {
    "post": {
      "tags": [
        "Posts"
      ],
      "summary": "Archive post",
      "description": "Archives a post. Requires admin authentication.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Post archived successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostResponse"
              }
            }
          }
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    }
  },
  "/api/v1/posts/{id}/restore": {
    "post": {
      "tags": [
        "Posts"
      ],
      "summary": "Restore post",
      "description": "Restores a soft-deleted post. Requires admin authentication.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Post restored successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostResponse"
              }
            }
          }
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    }
  },
  "/api/v1/posts/{id}/unpublish": {
    "post": {
      "tags": [
        "Posts"
      ],
      "summary": "Unpublish post",
      "description": "Moves a published post back to draft. Requires admin authentication.",
      "parameters": [
        {
          "$ref": "#/components/parameters/IdPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Post unpublished successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostResponse"
              }
            }
          }
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    }
  },
  "/api/v1/posts/{slug}": {
    "get": {
      "tags": [
        "Posts"
      ],
      "summary": "Get post by slug",
      "description": "Returns one published post by slug and increments its view count.",
      "security": [],
      "parameters": [
        {
          "$ref": "#/components/parameters/SlugPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Post fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PostResponse"
              }
            }
          }
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    }
  }
};
