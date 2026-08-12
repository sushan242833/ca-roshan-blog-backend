import { Transaction } from "sequelize";
import jwt from "jsonwebtoken";
import { env } from "@config/env";
import { CreatePostDto } from "@dto/create-post.dto";
import { PaginatedResponse } from "@dto/pagination.dto";
import {
  PostDetailResponse,
  PostSummaryResponse,
  toPostDetailResponse,
  toPostSummaryResponse,
} from "@dto/post-response.dto";
import { UpdatePostDto } from "@dto/update-post.dto";
import {
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ValidationIssue,
} from "@errors/http-error";
import { Post, PostCreationAttributes, PostStatus } from "@models/post.model";
import mediaRepository, {
  MediaRepository,
} from "@modules/media/media.repository";
import newsletterService, {
  NewsletterService,
} from "@services/newsletter.service";
import postRepository, {
  AdminPostListFilters,
  PostListFilters,
  PostRepository,
} from "@repositories/post.repository";
import { regeneratePostChapters } from "@services/post-chapter.service";
import { sanitizeArticleHtml } from "@utils/sanitize-content";
import { slugify } from "@utils/index";

const WORDS_PER_MINUTE = 200;
const MAX_META_TITLE_LENGTH = 60;
const MAX_META_DESCRIPTION_LENGTH = 160;

function normalizeRequiredString(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError([{ field, message: `${field} is required.` }]);
  }
  return normalized;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

// Content is stored as HTML, so strip tags and decode the common entities
// before building an excerpt — otherwise the auto-generated excerpt leaks
// raw markup like "<p><strong>…".
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function createExcerpt(content: string): string {
  return stripHtml(content).slice(0, MAX_META_DESCRIPTION_LENGTH);
}

// Excerpts are always plain text (rendered as such on cards), so strip any
// HTML a caller sends and collapse whitespace. Returns null when empty.
function normalizeExcerpt(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return stripHtml(value) || null;
}

function calculateReadingTime(content: string): number {
  // content is HTML — strip tags first, otherwise every tag counts as a "word"
  // and reading time is inflated.
  const words = stripHtml(content)
    .split(/\s+/)
    .filter((word) => word.length > 0);

  return Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE));
}

function uniqueValues(values: string[] | undefined): string[] {
  return Array.from(new Set(values ?? []));
}

function resolveCreateStatus(dto: CreatePostDto): PostStatus {
  if (dto.status) {
    return dto.status;
  }

  if (typeof dto.published === "boolean") {
    return dto.published ? PostStatus.PUBLISHED : PostStatus.DRAFT;
  }

  return PostStatus.DRAFT;
}

function resolveUpdateStatus(dto: UpdatePostDto): PostStatus | undefined {
  if (dto.status) {
    return dto.status;
  }

  if (typeof dto.published === "boolean") {
    return dto.published ? PostStatus.PUBLISHED : PostStatus.DRAFT;
  }

  return undefined;
}

function applyStatus(post: Post, status: PostStatus): void {
  post.status = status;

  if (status === PostStatus.PUBLISHED && !post.publishedAt) {
    post.publishedAt = new Date();
  }

  if (status === PostStatus.DRAFT) {
    post.publishedAt = null;
  }
}

function validateSeo(metaTitle: string | null, metaDescription: string | null): void {
  const errors: ValidationIssue[] = [];

  if (metaTitle && metaTitle.length > MAX_META_TITLE_LENGTH) {
    errors.push({
      field: "metaTitle",
      message: `metaTitle must be ${MAX_META_TITLE_LENGTH} characters or fewer.`,
    });
  }

  if (metaDescription && metaDescription.length > MAX_META_DESCRIPTION_LENGTH) {
    errors.push({
      field: "metaDescription",
      message: `metaDescription must be ${MAX_META_DESCRIPTION_LENGTH} characters or fewer.`,
    });
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}

function pagination<T>(
  rows: T[],
  count: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    items: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export class PostService {
  constructor(
    private readonly repository: PostRepository = postRepository,
    private readonly media: MediaRepository = mediaRepository,
    private readonly newsletters: NewsletterService = newsletterService,
  ) {}

  // Dispatches a post's newsletter at most once. `newsletterSentAt` is the
  // idempotency marker: set the first time it is sent, then checked here so a
  // later unpublish/republish cycle never re-sends to subscribers.
  private async dispatchNewsletterOnce(
    post: Post,
    shouldDispatch: boolean,
    transaction: Transaction,
  ): Promise<void> {
    if (!shouldDispatch || post.newsletterSentAt) {
      return;
    }
    await this.newsletters.schedulePostPublished(post.id, transaction);
    post.newsletterSentAt = new Date();
    await this.repository.save(post, transaction);
  }

  async create(
    adminId: string,
    dto: CreatePostDto,
  ): Promise<PostDetailResponse> {
    return this.repository.transaction(async (transaction) => {
      const title = normalizeRequiredString(dto.title, "title");
      // Sanitised before anything derives from it, so excerpt, searchText,
      // readingTime and the chapter split all come from the stored copy.
      const content = sanitizeArticleHtml(
        normalizeRequiredString(dto.content, "content"),
      );
      const excerpt = normalizeExcerpt(dto.excerpt) ?? createExcerpt(content);
      const metaTitle = normalizeOptionalString(dto.metaTitle) ?? title;
      const metaDescription =
        normalizeOptionalString(dto.metaDescription) ?? excerpt;
      const pdfUrl = normalizeOptionalString(dto.pdfUrl);
      const pdfLabel = normalizeOptionalString(dto.pdfLabel);
      const status = resolveCreateStatus(dto);
      const categoryIds = uniqueValues(dto.categoryIds);
      const tagIds = uniqueValues(dto.tagIds);

      validateSeo(metaTitle, metaDescription);
      await this.assertFeaturedImageExists(dto.featuredImageId, transaction);
      await this.assertCategoryExists(dto.categoryId, transaction);
      await this.assertTaxonomyIdsExist(categoryIds, tagIds, transaction);

      const slug = await this.generateUniqueSlug(
        dto.slug ?? title,
        undefined,
        transaction,
      );
      const payload: PostCreationAttributes = {
        title,
        slug,
        excerpt,
        content,
        searchText: stripHtml(content),
        featuredImageId: dto.featuredImageId ?? null,
        categoryId: dto.categoryId ?? null,
        metaTitle,
        metaDescription,
        pdfUrl,
        pdfLabel,
        showFeaturedImage: dto.showFeaturedImage ?? true,
        status,
        featured: dto.featured ?? false,
        readingTime: calculateReadingTime(content),
        viewCount: 0,
        adminId,
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
      };

      const post = await this.repository.create(payload, transaction);
      await this.repository.replaceCategories(post.id, categoryIds, transaction);
      await this.repository.replaceTags(post.id, tagIds, transaction);

      // Same transaction as the body it derives from, so the persisted split
      // can never survive a rolled-back create.
      await regeneratePostChapters(post, transaction, this.repository);

      await this.dispatchNewsletterOnce(
        post,
        post.status === PostStatus.PUBLISHED,
        transaction,
      );

      return toPostDetailResponse(
        await this.getPersistedPost(post.id, transaction),
      );
    });
  }

  async update(
    postId: string,
    dto: UpdatePostDto,
  ): Promise<PostDetailResponse> {
    return this.repository.transaction(async (transaction) => {
      const post = await this.repository.findById(postId, { transaction });
      if (!post) {
        throw new NotFoundError("Post not found.");
      }

      const previousStatus = post.status;
      const metaTitleWasFallback = !post.metaTitle || post.metaTitle === post.title;
      const metaDescriptionWasFallback =
        !post.metaDescription || post.metaDescription === (post.excerpt ?? "");

      if (typeof dto.title !== "undefined") {
        const title = normalizeRequiredString(dto.title, "title");
        if (title !== post.title && typeof dto.slug === "undefined") {
          post.slug = await this.generateUniqueSlug(title, post.id, transaction);
        }
        post.title = title;
      }

      if (typeof dto.slug !== "undefined") {
        post.slug = await this.generateUniqueSlug(dto.slug, post.id, transaction);
      }

      if (typeof dto.content !== "undefined") {
        // Assigned first so readingTime, searchText, the excerpt fallback and
        // the chapter regeneration below all read the sanitised copy rather
        // than the raw input.
        post.content = sanitizeArticleHtml(
          normalizeRequiredString(dto.content, "content"),
        );
        post.readingTime = calculateReadingTime(post.content);
        post.searchText = stripHtml(post.content);

        if (!post.excerpt && typeof dto.excerpt === "undefined") {
          post.excerpt = createExcerpt(post.content);
        }
      }

      if (typeof dto.excerpt !== "undefined") {
        post.excerpt = normalizeExcerpt(dto.excerpt);
      }

      if (typeof dto.featuredImageId !== "undefined") {
        await this.assertFeaturedImageExists(dto.featuredImageId, transaction);
        post.featuredImageId = dto.featuredImageId;
      }

      if (typeof dto.categoryId !== "undefined") {
        await this.assertCategoryExists(dto.categoryId, transaction);
        post.categoryId = dto.categoryId;
      }

      if (typeof dto.featured === "boolean") {
        post.featured = dto.featured;
      }

      const nextStatus = resolveUpdateStatus(dto);
      if (nextStatus) {
        applyStatus(post, nextStatus);
      }

      if (typeof dto.metaTitle !== "undefined") {
        post.metaTitle = normalizeOptionalString(dto.metaTitle) ?? post.title;
      } else if (metaTitleWasFallback) {
        post.metaTitle = post.title;
      }

      if (typeof dto.metaDescription !== "undefined") {
        post.metaDescription =
          normalizeOptionalString(dto.metaDescription) ?? (post.excerpt ?? "");
      } else if (metaDescriptionWasFallback) {
        post.metaDescription = post.excerpt ?? "";
      }

      validateSeo(post.metaTitle ?? null, post.metaDescription ?? null);

      // Sending null (or an empty string) clears the PDF; undefined leaves it
      // untouched, mirroring how the optional SEO fields flow through above.
      if (typeof dto.pdfUrl !== "undefined") {
        post.pdfUrl = normalizeOptionalString(dto.pdfUrl);
      }

      if (typeof dto.pdfLabel !== "undefined") {
        post.pdfLabel = normalizeOptionalString(dto.pdfLabel);
      }

      if (typeof dto.showFeaturedImage === "boolean") {
        post.showFeaturedImage = dto.showFeaturedImage;
      }

      if (dto.categoryIds) {
        const categoryIds = uniqueValues(dto.categoryIds);
        await this.assertTaxonomyIdsExist(categoryIds, undefined, transaction);
        await this.repository.replaceCategories(post.id, categoryIds, transaction);
      }

      if (dto.tagIds) {
        const tagIds = uniqueValues(dto.tagIds);
        await this.assertTaxonomyIdsExist(undefined, tagIds, transaction);
        await this.repository.replaceTags(post.id, tagIds, transaction);
      }

      await this.repository.save(post, transaction);

      // The split is a projection of `content` sliced at headings, and the
      // title supplies the chapter title when a post has no headings at all —
      // so either field changing invalidates it. Anything else (status, SEO,
      // taxonomies) leaves the stored chapters valid and is skipped.
      if (
        typeof dto.content !== "undefined" ||
        typeof dto.title !== "undefined"
      ) {
        await regeneratePostChapters(post, transaction, this.repository);
      }

      await this.dispatchNewsletterOnce(
        post,
        previousStatus === PostStatus.DRAFT &&
          post.status === PostStatus.PUBLISHED,
        transaction,
      );

      return toPostDetailResponse(
        await this.getPersistedPost(post.id, transaction),
      );
    });
  }

  async softDelete(postId: string): Promise<void> {
    await this.repository.transaction(async (transaction) => {
      const post = await this.repository.findById(postId, { transaction });
      if (!post) {
        throw new NotFoundError("Post not found.");
      }

      await this.repository.softDelete(post, transaction);
    });
  }

  async restore(postId: string): Promise<PostDetailResponse> {
    return this.repository.transaction(async (transaction) => {
      const post = await this.repository.findById(postId, {
        transaction,
        includeDeleted: true,
      });
      if (!post) {
        throw new NotFoundError("Post not found.");
      }

      if (post.deletedAt) {
        await this.repository.restore(post, transaction);
      }

      return toPostDetailResponse(
        await this.getPersistedPost(post.id, transaction),
      );
    });
  }

  async publish(postId: string): Promise<PostDetailResponse> {
    return this.transitionStatus(postId, PostStatus.PUBLISHED);
  }

  async archive(postId: string): Promise<PostDetailResponse> {
    return this.transitionStatus(postId, PostStatus.ARCHIVED);
  }

  async unpublish(postId: string): Promise<PostDetailResponse> {
    return this.transitionStatus(postId, PostStatus.DRAFT);
  }

  async getPublished(
    filters: PostListFilters,
  ): Promise<PaginatedResponse<PostSummaryResponse>> {
    const { rows, count } = await this.repository.listPublished(filters);
    return pagination(
      rows.map(toPostSummaryResponse),
      count,
      filters.page,
      filters.limit,
    );
  }

  async getFeatured(
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<PostSummaryResponse>> {
    const { rows, count } = await this.repository.listFeatured(page, limit);
    return pagination(rows.map(toPostSummaryResponse), count, page, limit);
  }

  async getBySlug(slug: string): Promise<PostDetailResponse> {
    const post = await this.repository.findPublishedBySlug(slug);
    if (!post) throw new NotFoundError("Post not found.");

    // Fire-and-forget: increment view count without blocking the response.
    // Errors are silently ignored so a count failure never breaks page load.
    this.repository.incrementViewCount(post.id).catch(() => {});

    return toPostDetailResponse(post);
  }

  async getDashboardStats(): Promise<{
    totalPosts: number;
    published: number;
    drafts: number;
    archived: number;
  }> {
    // Exclude soft-deleted posts (the model is paranoid, so the default count
    // already does). Passing paranoid:false would count deleted posts, making
    // these stats disagree with the admin list — which hides soft-deleted rows —
    // e.g. a "Published 14" badge over a list of only 11 live published posts.
    const [totalPosts, published, drafts, archived] = await Promise.all([
      Post.count(),
      Post.count({ where: { status: PostStatus.PUBLISHED } }),
      Post.count({ where: { status: PostStatus.DRAFT } }),
      Post.count({ where: { status: PostStatus.ARCHIVED } }),
    ]);
    return { totalPosts, published, drafts, archived };
  }

  async generatePreviewToken(postId: string): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    // Verify the post exists (published or draft, not soft-deleted)
    const post = await Post.findByPk(postId, { paranoid: true });
    if (!post) throw new NotFoundError("Post not found.");

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    const token = jwt.sign(
      { sub: postId, type: "preview" },
      env.JWT_SECRET,
      { expiresIn: "1h", algorithm: "HS256" },
    );

    return { token, expiresAt };
  }

  /**
   * Verifies a preview token and returns the post it points at, whatever its
   * status. Shared by the single-page preview response below and the chapter
   * preview endpoints (chapter.service), so the token rules live in one place.
   */
  async resolvePreviewPost(token: string): Promise<Post> {
    let payload: { sub: string; type: string };

    try {
      payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as {
        sub: string;
        type: string;
      };
    } catch {
      throw new UnauthorizedError("Preview link is invalid or has expired.");
    }

    if (payload.type !== "preview") {
      throw new UnauthorizedError("Invalid preview token.");
    }

    // Fetch the post regardless of status (draft or published)
    const post = await this.repository.findById(payload.sub, {
      withAssociations: true,
    });
    if (!post) throw new NotFoundError("Post not found.");

    return post;
  }

  async getByPreviewToken(token: string): Promise<PostDetailResponse> {
    return toPostDetailResponse(await this.resolvePreviewPost(token));
  }

  async adminList(
    filters: AdminPostListFilters,
  ): Promise<PaginatedResponse<PostSummaryResponse>> {
    const { rows, count } = await this.repository.adminList(filters);
    return pagination(
      rows.map(toPostSummaryResponse),
      count,
      filters.page,
      filters.limit,
    );
  }

  // Admin fetch for the post editor: any status, but never soft-deleted, and
  // never counted as a view (unlike the public getBySlug).
  async getAdminById(postId: string): Promise<PostDetailResponse> {
    const post = await this.repository.findById(postId, {
      withAssociations: true,
    });
    if (!post) {
      throw new NotFoundError("Post not found.");
    }

    return toPostDetailResponse(post);
  }

  private async transitionStatus(
    postId: string,
    status: PostStatus,
  ): Promise<PostDetailResponse> {
    return this.repository.transaction(async (transaction) => {
      const post = await this.repository.findById(postId, { transaction });
      if (!post) {
        throw new NotFoundError("Post not found.");
      }

      const previousStatus = post.status;
      applyStatus(post, status);
      await this.repository.save(post, transaction);
      await this.dispatchNewsletterOnce(
        post,
        previousStatus === PostStatus.DRAFT &&
          post.status === PostStatus.PUBLISHED,
        transaction,
      );

      return toPostDetailResponse(
        await this.getPersistedPost(post.id, transaction),
      );
    });
  }

  private async generateUniqueSlug(
    source: string,
    excludePostId: string | undefined,
    transaction: Transaction,
  ): Promise<string> {
    const baseSlug = slugify(source);
    let slug = baseSlug;
    let suffix = 2;

    while (await this.repository.slugExists(slug, excludePostId, transaction)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private async assertFeaturedImageExists(
    featuredImageId: string | null | undefined,
    transaction: Transaction,
  ): Promise<void> {
    if (typeof featuredImageId === "undefined" || featuredImageId === null) {
      return;
    }

    const media = await this.media.findById(featuredImageId, transaction);
    if (!media) {
      throw new ValidationError([
        {
          field: "featuredImageId",
          message: "Featured image does not exist.",
        },
      ]);
    }
  }

  private async assertCategoryExists(
    categoryId: string | null | undefined,
    transaction: Transaction,
  ): Promise<void> {
    if (typeof categoryId === "undefined" || categoryId === null) {
      return;
    }
    const exists = await this.repository.categoryIdsExist(
      [categoryId],
      transaction,
    );
    if (!exists) {
      throw new ValidationError([
        { field: "categoryId", message: "Category does not exist." },
      ]);
    }
  }

  private async assertTaxonomyIdsExist(
    categoryIds: string[] | undefined,
    tagIds: string[] | undefined,
    transaction: Transaction,
  ): Promise<void> {
    const errors: ValidationIssue[] = [];

    if (
      categoryIds &&
      !(await this.repository.categoryIdsExist(categoryIds, transaction))
    ) {
      errors.push({
        field: "categoryIds",
        message: "One or more categories do not exist.",
      });
    }

    if (tagIds && !(await this.repository.tagIdsExist(tagIds, transaction))) {
      errors.push({
        field: "tagIds",
        message: "One or more tags do not exist.",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }

  private async getPersistedPost(
    postId: string,
    transaction: Transaction,
  ): Promise<Post> {
    const post = await this.repository.findById(postId, {
      transaction,
      withAssociations: true,
    });

    if (!post) {
      throw new InternalServerError("Failed to load persisted post.");
    }

    return post;
  }
}

const postService = new PostService();

export default postService;
