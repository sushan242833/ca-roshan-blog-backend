import { Application, RequestHandler } from "express";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { env } from "@config/env";
import { responses } from "./components/responses";
import { parameters } from "./components/parameters";
import { bearerAuthSecurity, securitySchemes } from "./components/security";
import { authPaths } from "./paths/auth.paths";
import { categoryPaths } from "./paths/category.paths";
import { healthPaths } from "./paths/health.paths";
import { mediaPaths } from "./paths/media.paths";
import { newsletterPaths } from "./paths/newsletter.paths";
import { postPaths } from "./paths/post.paths";
import { tagPaths } from "./paths/tag.paths";
import { authSchemas } from "./schemas/auth.schema";
import { categorySchemas } from "./schemas/category.schema";
import { mediaSchemas } from "./schemas/media.schema";
import { newsletterSchemas } from "./schemas/newsletter.schema";
import { postSchemas } from "./schemas/post.schema";
import { tagSchemas } from "./schemas/tag.schema";

const docsPath = "/api/docs";
const legacyDocsPath = "/api-docs";
const swaggerEnabledNodeEnvironments = new Set<string>([
  "development",
  "staging",
]);

const swaggerDefinition: swaggerJSDoc.OAS3Definition = {
  openapi: "3.0.3",
  info: {
    title: "Roshan Blog API",
    version: "1.0.0",
    description: "Backend API for Roshan Blog Platform",
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: "Local development server",
    },
    {
      url: env.API_BASE_URL,
      description: "Configured API base URL",
    },
  ],
  tags: [
    {
      name: "Auth",
      description: "Admin authentication and token lifecycle",
    },
    {
      name: "Posts",
      description: "Blog post publishing and management",
    },
    {
      name: "Categories",
      description: "Category management",
    },
    {
      name: "Tags",
      description: "Tag management",
    },
    {
      name: "Media",
      description: "Media uploads and media library",
    },
    {
      name: "Newsletter",
      description: "Newsletter subscription workflows",
    },
    {
      name: "Health",
      description: "Service health checks",
    },
  ],
  security: [bearerAuthSecurity],
  paths: {
    ...healthPaths,
    ...authPaths,
    ...postPaths,
    ...categoryPaths,
    ...tagPaths,
    ...mediaPaths,
    ...newsletterPaths,
  },
  components: {
    securitySchemes,
    parameters,
    responses,
    schemas: {
      ...authSchemas,
      ...postSchemas,
      ...categorySchemas,
      ...tagSchemas,
      ...mediaSchemas,
      ...newsletterSchemas,
    },
  },
};

const options: swaggerJSDoc.OAS3Options = {
  definition: swaggerDefinition,
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options) as swaggerUi.JsonObject;

function isExplicitlyEnabled(value: string | undefined): boolean {
  return typeof value === "string" && value.toLowerCase() === "true";
}

export function isSwaggerEnabled(): boolean {
  const nodeEnv = process.env.NODE_ENV ?? env.NODE_ENV;
  return (
    isExplicitlyEnabled(process.env.ENABLE_SWAGGER) ||
    swaggerEnabledNodeEnvironments.has(nodeEnv)
  );
}

const removeSwaggerContentSecurityPolicy: RequestHandler = (_req, res, next) => {
  res.removeHeader("Content-Security-Policy");
  next();
};

export function setupSwagger(app: Application): void {
  if (!isSwaggerEnabled()) {
    return;
  }

  app.get(`${docsPath}.json`, (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    return res.send(swaggerSpec);
  });
  app.get(`${legacyDocsPath}.json`, (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    return res.send(swaggerSpec);
  });

  app.use(
    [docsPath, legacyDocsPath],
    removeSwaggerContentSecurityPolicy,
    ...swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Roshan Blog API Docs",
      swaggerOptions: {
        displayRequestDuration: true,
        filter: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
      },
    }),
  );

  console.log(`Swagger docs available at ${docsPath} and ${legacyDocsPath}`);
}

export default swaggerSpec;
