import type { ParameterCollection } from "../types";

export const parameters: ParameterCollection = {
  "IdPathParam": {
    "in": "path",
    "name": "id",
    "required": true,
    "schema": {
      "type": "string",
      "format": "uuid"
    },
    "example": "5020ddfc-77fa-44c7-9a7a-444444444444"
  },
  "SlugPathParam": {
    "in": "path",
    "name": "slug",
    "required": true,
    "schema": {
      "type": "string"
    },
    "example": "building-production-grade-rest-apis"
  },
  "TokenPathParam": {
    "in": "path",
    "name": "token",
    "required": true,
    "schema": {
      "type": "string",
      "minLength": 32,
      "maxLength": 255
    },
    "example": "12d9a5b4690b445f832d2d5036bf2fb3"
  },
  "PageQueryParam": {
    "in": "query",
    "name": "page",
    "required": false,
    "schema": {
      "type": "integer",
      "minimum": 1,
      "default": 1
    },
    "example": 1
  },
  "LimitQueryParam": {
    "in": "query",
    "name": "limit",
    "required": false,
    "schema": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 10
    },
    "example": 10
  }
};
