import { NextFunction, Request, Response } from "express";
import chapterService from "@services/chapter.service";
import {
  EmptyRequestBody,
  SlugRequestParams,
} from "@app-types/http.requests";

// GET /api/v1/posts/:slug/chapters
// Small, cacheable index for the article landing page.
export async function getChapterIndex(
  req: Request<SlugRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await chapterService.getIndex(req.params.slug);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/posts/preview/:token/chapters
// Same index as above, for a post resolved from a preview token, so a draft
// previews with the same pagination it will have once published.
export async function getPreviewChapterIndex(
  req: Request<{ token: string }, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await chapterService.getPreviewIndex(req.params.token);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/posts/preview/:token/chapters/:chapterId
export async function getPreviewChapter(
  req: Request<
    { token: string; chapterId: string },
    unknown,
    EmptyRequestBody
  >,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await chapterService.getPreviewChapter(
      req.params.token,
      req.params.chapterId,
    );
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/posts/:slug/chapters/:chapterId
// One chapter's HTML plus prev/next references.
export async function getChapter(
  req: Request<
    SlugRequestParams & { chapterId: string },
    unknown,
    EmptyRequestBody
  >,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await chapterService.getChapter(
      req.params.slug,
      req.params.chapterId,
    );
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}
