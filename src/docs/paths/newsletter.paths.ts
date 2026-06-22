import type { PathCollection } from "../types";

export const newsletterPaths: PathCollection = {
  "/api/v1/subscribers": {
    "post": {
      "tags": [
        "Newsletter"
      ],
      "summary": "Subscribe to newsletter",
      "description": "Creates a pending newsletter subscription and sends a verification email.",
      "security": [],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/SubscribeRequest"
            },
            "examples": {
              "subscribe": {
                "summary": "Subscribe payload",
                "value": {
                  "email": "reader@example.com"
                }
              }
            }
          }
        }
      },
      "responses": {
        "201": {
          "description": "Subscription created successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SubscriberResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "409": {
          "$ref": "#/components/responses/ConflictError"
        }
      }
    }
  },
  "/api/v1/subscribers/verify/{token}": {
    "get": {
      "tags": [
        "Newsletter"
      ],
      "summary": "Verify newsletter subscription",
      "description": "Verifies a pending subscriber by verification token.",
      "security": [],
      "parameters": [
        {
          "$ref": "#/components/parameters/TokenPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Subscription verified successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SubscriberResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    }
  },
  "/api/v1/subscribers/unsubscribe/{token}": {
    "post": {
      "tags": [
        "Newsletter"
      ],
      "summary": "Unsubscribe from newsletter",
      "description": "Unsubscribes a subscriber by unsubscribe token.",
      "security": [],
      "parameters": [
        {
          "$ref": "#/components/parameters/TokenPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Subscriber unsubscribed successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SubscriberResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    },
    "get": {
      "tags": [
        "Newsletter"
      ],
      "summary": "Unsubscribe from newsletter",
      "description": "Browser-friendly unsubscribe endpoint using the unsubscribe token.",
      "security": [],
      "parameters": [
        {
          "$ref": "#/components/parameters/TokenPathParam"
        }
      ],
      "responses": {
        "200": {
          "description": "Subscriber unsubscribed successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SubscriberResponse"
              }
            }
          }
        },
        "400": {
          "$ref": "#/components/responses/ValidationError"
        },
        "404": {
          "$ref": "#/components/responses/NotFoundError"
        }
      }
    }
  },
  "/api/v1/admin/subscribers": {
    "get": {
      "tags": [
        "Newsletter"
      ],
      "summary": "List newsletter subscribers",
      "description": "Returns paginated newsletter subscribers for admins.",
      "parameters": [
        {
          "$ref": "#/components/parameters/PageQueryParam"
        },
        {
          "$ref": "#/components/parameters/LimitQueryParam"
        },
        {
          "in": "query",
          "name": "status",
          "required": false,
          "schema": {
            "$ref": "#/components/schemas/SubscriberStatus"
          },
          "example": "ACTIVE"
        },
        {
          "in": "query",
          "name": "search",
          "required": false,
          "schema": {
            "type": "string"
          },
          "example": "reader@example.com"
        },
        {
          "in": "query",
          "name": "q",
          "required": false,
          "schema": {
            "type": "string"
          },
          "example": "reader@example.com"
        }
      ],
      "responses": {
        "200": {
          "description": "Subscribers fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SubscriberListResponse"
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
  "/api/v1/admin/subscribers/stats": {
    "get": {
      "tags": [
        "Newsletter"
      ],
      "summary": "Newsletter subscriber stats",
      "description": "Returns total subscriber counts grouped by status.",
      "responses": {
        "200": {
          "description": "Subscriber stats fetched successfully.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SubscriberStatsResponse"
              }
            }
          }
        },
        "401": {
          "$ref": "#/components/responses/UnauthorizedError"
        }
      }
    }
  }
};
