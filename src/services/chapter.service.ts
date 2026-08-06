import postRepository from "@repositories/post.repository";
import postService from "@services/post.service";
import { Post } from "@models/post.model";
import {
  toPostSummaryResponse,
  type ChapterSummary,
  type ChapterIndexResponse,
  type ChapterDetailResponse,
} from "@dto/post-response.dto";
import { splitIntoChapters } from "@utils/chapter-split";
import { NotFoundError } from "@errors/http-error";

// A post is only paginated into chapters when its stored HTML is large enough
// that returning it whole would blow Next.js's 2 MB fetch-cache limit (and be
// slow to render/parse). Below this, the post is served as a single page
// exactly as before, so normal-length articles are unaffected. Headroom is left
// below 2 MB for the JSON envelope (post metadata) around the content.
const PAGINATION_BYTE_THRESHOLD = 1_500_000;

function byteLength(text: string): number {
  return Buffer.byteLength(text ?? "", "utf8");
}

function toSummary(c: ChapterSummary): ChapterSummary {
  return {
    id: c.id,
    title: c.title,
    order: c.order,
    excerpt: c.excerpt,
  };
}

class ChapterService {
  // Response builders, kept separate from how the post was found: the public
  // routes resolve it by slug and the preview routes by token, but both must
  // paginate identically so a draft previews exactly as it will publish.

  private buildIndex(post: Post): ChapterIndexResponse {
    const summary = toPostSummaryResponse(post);
    const chapters = splitIntoChapters(post.content, post.title);
    const paginated =
      byteLength(post.content) > PAGINATION_BYTE_THRESHOLD &&
      chapters.length > 1;

    if (!paginated) {
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

  /**
   * Lightweight index for the article landing page. Always small and cacheable.
   * For a short post it returns the full `content` inline (so the landing can
   * render the article as one page, as before); for a large post it returns the
   * chapter list with `paginated: true` and no content.
   */
  async getIndex(slug: string): Promise<ChapterIndexResponse> {
    const post = await postRepository.findPublishedBySlug(slug);
    if (!post) throw new NotFoundError("Post not found.");

    // One view per article open, counted here on the landing fetch (mirrors the
    // old single-page getBySlug). Paging between chapters does not re-count.
    postRepository.incrementViewCount(post.id).catch(() => {});

    return this.buildIndex(post);
  }

  /**
   * A single chapter's HTML plus prev/next references, for a chapter page.
   * Never returns view-count increments (that happens on the index).
   */
  async getChapter(
    slug: string,
    chapterId: string,
  ): Promise<ChapterDetailResponse> {
    const post = await postRepository.findPublishedBySlug(slug);
    if (!post) throw new NotFoundError("Post not found.");

    return this.buildChapter(post, chapterId);
  }

  // Preview equivalents. The post is resolved from the signed preview token
  // instead of a slug, so drafts are reachable; no view count is recorded,
  // since an author checking their own draft is not a reader.
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
