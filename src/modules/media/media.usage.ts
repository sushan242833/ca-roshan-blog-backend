import { Op } from "sequelize";
import { Admin } from "@models/index";
import { PostStatus } from "@models/post.model";
import postRepository, {
  PostRepository,
  escapeLikePattern,
} from "@repositories/post.repository";
import { MediaAttributes } from "./media.model";

// How a post points at a media item. A single post can use one file in more
// than one place (e.g. the featured image also embedded in the body).
export type MediaUsageRole = "featuredImage" | "content" | "pdf";

export interface MediaUsagePostReference {
  postId: string;
  title: string;
  slug: string;
  status: PostStatus;
  /** Soft-deleted post, still restorable — so it still holds onto the file. */
  trashed: boolean;
  usedAs: MediaUsageRole[];
}

export interface MediaUsage {
  inUse: boolean;
  posts: MediaUsagePostReference[];
  /** The author profile picture rendered on the byline and About page. */
  usedByAuthorAvatar: boolean;
}

type MediaUsageTarget = Pick<MediaAttributes, "id" | "fileName" | "url">;

// A stored file name is a UUID plus an extension. The stem alone is enough to
// identify it and is provider-agnostic: local uploads serve
// /uploads/<uuid>.<ext>, while Cloudinary delivers <folder>/<uuid>.<format>
// where the format may differ from the uploaded extension.
const MIN_TOKEN_LENGTH = 8;

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^./\\]+$/, "");
}

// The substrings whose presence in a post body (or pdfUrl) means the post is
// using this file. The stored URL is only added when it does not already
// contain the stem, which is the case for every provider in use today.
export function mediaMatchTokens(media: MediaUsageTarget): string[] {
  const stem = stripExtension(media.fileName);
  const primary = stem.length >= MIN_TOKEN_LENGTH ? stem : media.fileName;
  const tokens = [primary];

  if (!media.url.includes(primary)) {
    tokens.push(media.url);
  }

  return tokens;
}

// Answers "is this file used?" for a whole media list without a query per row.
export interface MediaUsageIndex {
  isUsed(media: MediaUsageTarget): boolean;
}

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function extractUuids(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return (value.match(UUID_PATTERN) ?? []).map((uuid) => uuid.toLowerCase());
}

export class MediaUsageService {
  constructor(private readonly posts: PostRepository = postRepository) {}

  // Two queries for the entire library: the featured-image keys and the set of
  // file-name UUIDs referenced from post bodies, PDF links, and the author
  // avatar. A media row is used when it matches either.
  async buildIndex(): Promise<MediaUsageIndex> {
    const [postKeys, admins] = await Promise.all([
      this.posts.findReferencedMediaKeys(),
      Admin.findAll({ attributes: ["avatarUrl"], raw: true }),
    ]);

    const featuredImageIds = new Set(postKeys.featuredImageIds);
    const referencedFiles = new Set(postKeys.fileNameTokens);
    for (const admin of admins) {
      extractUuids(admin.avatarUrl).forEach((uuid) =>
        referencedFiles.add(uuid),
      );
    }

    return {
      isUsed: (media) =>
        featuredImageIds.has(media.id) ||
        // Both the stored file name and the URL are scanned so the lookup does
        // not depend on which of the two a post embedded.
        extractUuids(`${media.fileName} ${media.url}`).some((uuid) =>
          referencedFiles.has(uuid),
        ),
    };
  }

  async find(media: MediaUsageTarget): Promise<MediaUsage> {
    const tokens = mediaMatchTokens(media);
    const [referencingPosts, avatarCount] = await Promise.all([
      this.posts.findPostsReferencingMedia(media.id, tokens),
      this.countAdminsUsingMedia(tokens),
    ]);

    const posts = referencingPosts.map<MediaUsagePostReference>((post) => {
      const usedAs: MediaUsageRole[] = [];

      if (post.featuredImageId === media.id) {
        usedAs.push("featuredImage");
      }
      if (post.pdfUrl && matchesAnyToken(post.pdfUrl, tokens)) {
        usedAs.push("pdf");
      }
      // The row matched the WHERE clause, so if it was neither the featured
      // image nor the PDF link, the body HTML is what referenced the file.
      if (usedAs.length === 0) {
        usedAs.push("content");
      }

      return {
        postId: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        trashed: Boolean(post.deletedAt),
        usedAs,
      };
    });

    return {
      inUse: posts.length > 0 || avatarCount > 0,
      posts,
      usedByAuthorAvatar: avatarCount > 0,
    };
  }

  // The avatar is stored as a plain URL rather than a media FK, so it is
  // matched the same way post bodies are.
  private async countAdminsUsingMedia(tokens: string[]): Promise<number> {
    return Admin.count({
      where: {
        [Op.or]: tokens.map((token) => ({
          avatarUrl: { [Op.iLike]: `%${escapeLikePattern(token)}%` },
        })),
      },
    });
  }
}

function matchesAnyToken(value: string, tokens: string[]): boolean {
  const haystack = value.toLowerCase();
  return tokens.some((token) => haystack.includes(token.toLowerCase()));
}

// Human-readable reason for a blocked delete, e.g.
// "It is used by 2 posts: “Draft one” (draft), “Old news” (archived)."
export function describeMediaUsage(usage: MediaUsage): string {
  const parts: string[] = [];

  if (usage.posts.length > 0) {
    const listed = usage.posts
      .slice(0, MAX_LISTED_POSTS)
      .map((post) => `“${post.title}” (${describePostState(post)})`)
      .join(", ");
    const remaining = usage.posts.length - MAX_LISTED_POSTS;
    const suffix = remaining > 0 ? `, and ${remaining} more` : "";

    parts.push(
      `${usage.posts.length} ${usage.posts.length === 1 ? "post" : "posts"}: ${listed}${suffix}`,
    );
  }

  if (usage.usedByAuthorAvatar) {
    parts.push("the author profile picture");
  }

  return parts.join(" and ");
}

const MAX_LISTED_POSTS = 3;

function describePostState(post: MediaUsagePostReference): string {
  if (post.trashed) {
    return "trashed";
  }
  return post.status.toLowerCase();
}

const mediaUsageService = new MediaUsageService();

export default mediaUsageService;
