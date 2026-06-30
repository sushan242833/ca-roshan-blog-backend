import { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ValidationError } from "@errors/http-error";
import { PostStatus } from "@models/post.model";
import postService from "@services/post.service";
import newsletterService from "@services/newsletter.service";
import { AuthenticatedAdmin } from "@app-types/authenticated-admin";
import {
  CreatePostRequest,
  EmptyRequestBody,
  EmptyRequestParams,
  IdRequestParams,
  SlugRequestParams,
  UpdatePostRequest,
} from "@app-types/http.requests";

const DEFAULT_PUBLIC_LIMIT = 10;
const DEFAULT_ADMIN_LIMIT = 20;
const MAX_LIMIT = 100;

type RequestQuery = Request<
  EmptyRequestParams,
  unknown,
  EmptyRequestBody
>["query"];

function getQueryString(value: RequestQuery[string]): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function getSearchQuery(req: { query: RequestQuery }): string | undefined {
  return getQueryString(req.query.search) ?? getQueryString(req.query.q);
}

function getPositiveIntegerQuery(
  req: { query: RequestQuery },
  field: string,
  fallback: number,
  max?: number,
): number {
  const rawValue = getQueryString(req.query[field]);
  if (typeof rawValue === "undefined") {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError([
      { field, message: `${field} must be a positive integer.` },
    ]);
  }

  return typeof max === "number" ? Math.min(parsed, max) : parsed;
}

function getBooleanQuery(
  req: { query: RequestQuery },
  field: string,
): boolean | undefined {
  const rawValue = getQueryString(req.query[field]);
  if (typeof rawValue === "undefined") {
    return undefined;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new ValidationError([
    { field, message: `${field} must be true or false.` },
  ]);
}

function getAdminId(req: { user?: AuthenticatedAdmin }): string {
  if (!req.user?.id) {
    throw new UnauthorizedError("Admin authentication is required.");
  }

  return req.user.id;
}

export async function createPost(
  req: Request<EmptyRequestParams, unknown, CreatePostRequest>,
  res: Response,
  next: NextFunction,
) {
  try {
    const post = await postService.create(getAdminId(req), req.body);
    return res.status(201).json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function updatePost(
  req: Request<IdRequestParams, unknown, UpdatePostRequest>,
  res: Response,
  next: NextFunction,
) {
  try {
    const post = await postService.update(req.params.id, req.body);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function deletePost(
  req: Request<IdRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    await postService.softDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export async function restorePost(
  req: Request<IdRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const post = await postService.restore(req.params.id);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function publishPost(
  req: Request<IdRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const post = await postService.publish(req.params.id);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function archivePost(
  req: Request<IdRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const post = await postService.archive(req.params.id);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function unpublishPost(
  req: Request<IdRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const post = await postService.unpublish(req.params.id);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function listPublished(
  req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await postService.getPublished({
      page: getPositiveIntegerQuery(req, "page", 1),
      limit: getPositiveIntegerQuery(req, "limit", DEFAULT_PUBLIC_LIMIT, MAX_LIMIT),
      search: getSearchQuery(req),
      category: getQueryString(req.query.category),
      tag: getQueryString(req.query.tag),
      featured: getBooleanQuery(req, "featured"),
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

export async function listFeatured(
  req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await postService.getFeatured(
      getPositiveIntegerQuery(req, "page", 1),
      getPositiveIntegerQuery(req, "limit", DEFAULT_PUBLIC_LIMIT, MAX_LIMIT),
    );
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

export async function getBySlug(
  req: Request<SlugRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const post = await postService.getBySlug(req.params.slug);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function adminList(
  req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await postService.adminList({
      page: getPositiveIntegerQuery(req, "page", 1),
      limit: getPositiveIntegerQuery(req, "limit", DEFAULT_ADMIN_LIMIT, MAX_LIMIT),
      search: getSearchQuery(req),
      status: getQueryString(req.query.status) as PostStatus | undefined,
      includeDeleted: getBooleanQuery(req, "includeDeleted") ?? false,
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

export async function getDashboardStats(
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const [postStats, subscriberStats] = await Promise.all([
      postService.getDashboardStats(),
      newsletterService.stats(),
    ]);
    return res.json({
      success: true,
      data: {
        totalPosts: postStats.totalPosts,
        published: postStats.published,
        drafts: postStats.drafts,
        archived: postStats.archived,
        totalSubscribers: subscriberStats.total,
        activeSubscribers: subscriberStats.active,
        pendingSubscribers: subscriberStats.pending,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function generatePreviewToken(
  req: Request<IdRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await postService.generatePreviewToken(req.params.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

export async function getByPreviewToken(
  req: Request<{ token: string }, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const post = await postService.getByPreviewToken(req.params.token);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export default {
  createPost,
  updatePost,
  deletePost,
  restorePost,
  publishPost,
  archivePost,
  unpublishPost,
  listPublished,
  listFeatured,
  getBySlug,
  adminList,
  getDashboardStats,
  generatePreviewToken,
  getByPreviewToken,
};
