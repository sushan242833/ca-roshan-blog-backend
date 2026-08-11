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

// A persisted row carries the same four fields under `chapterId`; the wire
// shape stays `id`, so existing chapter URLs and the frontend are untouched.
function toRowSummary(row: PostChapter): ChapterSummary {
  return {
    id: row.chapterId,
    title: row.title,
    order: row.order,
    excerpt: row.excerpt ?? null,
  };
}

class ChapterService {
  // Public reads never load `posts.content` for a paginated post: the post row
  // is fetched without its body and the chapters come from post_chapters, so
  // serving one chapter costs one chapter's bytes rather than the whole
  // article. The preview reads below still split in memory — see there for why.

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

  /**
   * Lightweight index for the article landing page. Always small and cacheable.
   * For a short post it returns the full `content` inline (so the landing can
   * render the article as one page, as before); for a large post it returns the
   * chapter list with `paginated: true` and no content.
   *
   * The post row is loaded without its body in both cases. Only the short-post
   * branch goes back for `content`, and only because it is about to send it.
   */
  async getIndex(slug: string): Promise<ChapterIndexResponse> {
    const post = await postRepository.findPublishedBySlugLean(slug);
    if (!post) throw new NotFoundError("Post not found.");

    // One view per article open, counted here on the landing fetch (mirrors the
    // old single-page getBySlug). Paging between chapters does not re-count.
    postRepository.incrementViewCount(post.id).catch(() => {});

    const summary = toPostSummaryResponse(post);

    if (post.paginated) {
      const chapters = await postRepository.findPublishedChapterList(post.id);

      // `paginated` and the rows are written together in one transaction, so an
      // empty list here means the split was never generated for this post (an
      // unrun backfill). Fall back to the inline body rather than serving a
      // landing page with no way into the article.
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

  /**
   * Every published, paginated post's chapter ids, for the frontend's
   * generateStaticParams. One query, three columns, no bodies.
   *
   * Only posts that actually have chapter rows appear — the same condition
   * getIndex applies before it reports `paginated: true`, so the manifest lists
   * exactly the chapter URLs that resolve.
   */
  async getManifest(): Promise<ChapterManifestEntry[]> {
    const rows = await postRepository.findChapterManifest();

    // Rows arrive grouped by slug and ordered within each post, so a Map keyed
    // by slug preserves both without re-sorting.
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

  /**
   * A single chapter's HTML plus prev/next references, for a chapter page.
   * Never returns view-count increments (that happens on the index).
   *
   * Three small reads — the bodyless post, the one chapter row, and its two
   * neighbours' summaries — and none of them touch `posts.content`.
   */
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

  // Preview equivalents. The post is resolved from the signed preview token
  // instead of a slug, so drafts are reachable; no view count is recorded,
  // since an author checking their own draft is not a reader.
  //
  // These deliberately keep the in-memory split: a draft may not have been
  // saved since its last edit, so the persisted chapters could be stale, and
  // preview traffic is a handful of requests by one author. Nothing is written
  // to post_chapters from a preview.
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
