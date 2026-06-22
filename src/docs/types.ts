import type swaggerJSDoc from "swagger-jsdoc";

export type Components = NonNullable<swaggerJSDoc.OAS3Definition["components"]>;
export type ParameterCollection = NonNullable<Components["parameters"]>;
export type PathCollection = NonNullable<swaggerJSDoc.OAS3Definition["paths"]>;
export type ResponseCollection = NonNullable<Components["responses"]>;
export type SecuritySchemeCollection = NonNullable<Components["securitySchemes"]>;
