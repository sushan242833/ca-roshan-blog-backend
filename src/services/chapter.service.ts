import postRepository from "@repositories/post.repository";
import postService from "@services/post.service";
import { shouldPaginate } from "@services/post-chapter.service";
import { Post } from "@models/post.model";
import { PostChapter } from "@models/post-chapter.model";
import {
  toPostSummaryResponse,
  type ChapterSummary,
  type ChapterIndexResponse,
  type ChapterDetailResponse,
  type ChapterManifestEntry,
} from "@dto/post-response.dto";
import { splitIntoChapters } from "@utils/chapter-split";
import { NotFoundError } from "@errors/http-error";

function toSummary(c: ChapterSummary): ChapterSummary {
  return {
    id: c.id,
    title: c.title,
    order: c.order,
    excerpt: c.excerpt,
  };
}

function toRowSummary(row: PostChapter): ChapterSummary {
  return {
    id: row.chapterId,
    title: row.title,
    order: row.order,
    excerpt: row.excerpt ?? null,
  };
}

class ChapterService {
  private buildIndex(post: Post): ChapterIndexResponse {
    const summary = toPostSummaryResponse(post);
    const chapters = splitIntoChapters(post.content, post.title);

    if (!shouldPaginate(post.content, chapters)) {
      return {
        ...summary,
        paginated: false,
        totalChapters: 1,
        chapters: [],
        content: post.content,
      };
    }

    return {
      ...summary,
      paginated: true,
      totalChapters: chapters.length,
      chapters: chapters.map(toSummary),
      content: null,
    };
  }

  private buildChapter(post: Post, chapterId: string): ChapterDetailResponse {
    const chapters = splitIntoChapters(post.content, post.title);
    const idx = chapters.findIndex((c) => c.id === chapterId);
    if (idx === -1) throw new NotFoundError("Chapter not found.");

    const current = chapters[idx];
    const summary = toPostSummaryResponse(post);

    return {
      ...summary,
      totalChapters: chapters.length,
      chapter: {
        id: current.id,
        title: current.title,
        order: current.order,
        html: current.html,
        excerpt: current.excerpt,
      },
      prev: idx > 0 ? toSummary(chapters[idx - 1]) : null,
      next: idx + 1 < chapters.length ? toSummary(chapters[idx + 1]) : null,
    };
  }

  async getIndex(slug: string): Promise<ChapterIndexResponse> {
    const post = await postRepository.findPublishedBySlugLean(slug);
    if (!post) throw new NotFoundError("Post not found.");

    postRepository.incrementViewCount(post.id).catch(() => {});

    const summary = toPostSummaryResponse(post);

    if (post.paginated) {
      const chapters = await postRepository.findPublishedChapterList(post.id);

      if (chapters.length > 0) {
        return {
          ...summary,
          paginated: true,
          totalChapters: post.chapterCount,
          chapters: chapters.map(toRowSummary),
          content: null,
        };
      }
    }

    return {
      ...summary,
      paginated: false,
      totalChapters: 1,
      chapters: [],
      content: (await postRepository.findContentById(post.id)) ?? "",
    };
  }

  async getManifest(): Promise<ChapterManifestEntry[]> {
    const rows = await postRepository.findChapterManifest();

    const bySlug = new Map<string, string[]>();
    for (const row of rows) {
      const slug = row.post?.slug;
      if (!slug) continue;

      const ids = bySlug.get(slug);
      if (ids) ids.push(row.chapterId);
      else bySlug.set(slug, [row.chapterId]);
    }

    return [...bySlug].map(([slug, chapterIds]) => ({ slug, chapterIds }));
  }

  async getChapter(
    slug: string,
    chapterId: string,
  ): Promise<ChapterDetailResponse> {
    const post = await postRepository.findPublishedBySlugLean(slug);
    if (!post) throw new NotFoundError("Post not found.");

    const row = await postRepository.findPublishedChapter(post.id, chapterId);
    if (!row) throw new NotFoundError("Chapter not found.");

    const { prev, next } = await postRepository.findAdjacentChapterSummaries(
      post.id,
      row.order,
    );

    return {
      ...toPostSummaryResponse(post),
      totalChapters: post.chapterCount,
      chapter: {
        id: row.chapterId,
        title: row.title,
        order: row.order,
        html: row.html,
        excerpt: row.excerpt ?? null,
      },
      prev: prev ? toRowSummary(prev) : null,
      next: next ? toRowSummary(next) : null,
    };
  }

  async getPreviewIndex(token: string): Promise<ChapterIndexResponse> {
    return this.buildIndex(await postService.resolvePreviewPost(token));
  }

  async getPreviewChapter(
    token: string,
    chapterId: string,
  ): Promise<ChapterDetailResponse> {
    return this.buildChapter(
      await postService.resolvePreviewPost(token),
      chapterId,
    );
  }
}

const chapterService = new ChapterService();
export default chapterService;
