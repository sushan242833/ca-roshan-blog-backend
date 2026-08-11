import { Transaction } from "sequelize";
import { Post } from "@models/post.model";
import postRepository, { PostRepository } from "@repositories/post.repository";
import { splitIntoChapters, type RawChapter } from "@utils/chapter-split";

// A post is only paginated into chapters when its stored HTML is large enough
// that returning it whole would blow Next.js's 2 MB fetch-cache limit (and be
// slow to render/parse). Below this, the post is served as a single page
// exactly as before, so normal-length articles are unaffected. Headroom is left
// below 2 MB for the JSON envelope (post metadata) around the content.
//
// Single source of truth: the persisted split (here) and the in-memory preview
// split (chapter.service) must agree, or a draft would preview with different
// pagination than it publishes with.
export const PAGINATION_BYTE_THRESHOLD = 1_500_000;

export function byteLength(text: string | null | undefined): number {
  return Buffer.byteLength(text ?? "", "utf8");
}

// Pagination needs both a body large enough to be worth splitting AND more than
// one chapter to split it into — a 2 MB post with no headings stays one page.
export function shouldPaginate(
  content: string | null | undefined,
  chapters: RawChapter[],
): boolean {
  return byteLength(content) > PAGINATION_BYTE_THRESHOLD && chapters.length > 1;
}

export interface RegeneratedChapters {
  paginated: boolean;
  chapterCount: number;
}

/**
 * Rebuilds a post's persisted chapter split from its `content`, inside the
 * caller's transaction so the rows can never disagree with the body that
 * produced them — if the post write rolls back, so does the split.
 *
 * Must be called on every path that writes `content`. Chapter ids come from
 * splitIntoChapters and are derived deterministically from the heading text, so
 * regenerating an unchanged body reproduces the same ids and existing chapter
 * URLs keep working.
 */
export async function regeneratePostChapters(
  post: Post,
  transaction: Transaction,
  repository: PostRepository = postRepository,
): Promise<RegeneratedChapters> {
  const chapters = splitIntoChapters(post.content, post.title);
  const paginated = shouldPaginate(post.content, chapters);

  // Short posts store no chapter rows at all — they render from `content`
  // inline, so persisting a second copy of the body would only add egress.
  await repository.replaceChapters(
    post.id,
    paginated
      ? chapters.map((chapter) => ({
          postId: post.id,
          chapterId: chapter.id,
          order: chapter.order,
          title: chapter.title,
          excerpt: chapter.excerpt,
          html: chapter.html,
        }))
      : [],
    transaction,
  );

  const chapterCount = paginated ? chapters.length : 1;
  await repository.updateChapterMeta(
    post.id,
    paginated,
    chapterCount,
    transaction,
  );

  // Keep the caller's in-memory instance in step with the row it just wrote,
  // marked unchanged so a later save() on the same instance does not re-issue
  // these two columns.
  post.set({ paginated, chapterCount });
  post.changed("paginated", false);
  post.changed("chapterCount", false);

  return { paginated, chapterCount };
}
