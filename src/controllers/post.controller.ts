import { Request, Response, NextFunction } from "express";
import postService from "@services/post.service";
import { CreatePostDto } from "@dto/create-post.dto";
import { UpdatePostDto } from "@dto/update-post.dto";

export async function createPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const admin = (req as any).user;
    const dto = req.body as CreatePostDto;
    const post = await postService.create(admin.id, dto);
    return res.status(201).json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function updatePost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const postId = req.params.id;
    const dto = req.body as UpdatePostDto;
    const post = await postService.update(postId, dto);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function deletePost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const postId = req.params.id;
    await postService.softDelete(postId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export async function publishPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const postId = req.params.id;
    const post = await postService.publish(postId);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function unpublishPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const postId = req.params.id;
    const post = await postService.unpublish(postId);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function listPublished(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const q = req.query.q as string | undefined;
    const result = await postService.getPublished(page, limit, q);
    return res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    return next(err);
  }
}

export async function getBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const slug = req.params.slug;
    const post = await postService.getBySlug(slug);
    return res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
}

export async function adminList(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const q = req.query.q as string | undefined;
    const includeDeleted = req.query.includeDeleted === "true";
    const result = await postService.adminList(page, limit, q, includeDeleted);
    return res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    return next(err);
  }
}

export default {
  createPost,
  updatePost,
  deletePost,
  publishPost,
  unpublishPost,
  listPublished,
  getBySlug,
  adminList,
};
