import {
  FindAndCountOptions,
  Includeable,
  Op,
  Order,
  OrderItem,
  Transaction,
  WhereOptions,
} from "sequelize";
import {
  Admin,
  Category,
  Media,
  Post,
  PostCategory,
  PostTag,
  Tag,
  sequelize,
} from "@models/index";
import {
  PostAttributes,
  PostCreationAttributes,
  PostStatus,
} from "@models/post.model";

export interface PostListFilters {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
}

export interface AdminPostListFilters {
  page: number;
  limit: number;
  search?: string;
  status?: PostStatus;
  includeDeleted: boolean;
}

export interface PaginatedPosts {
  rows: Post[];
  count: number;
}

export interface FindPostOptions {
  transaction?: Transaction;
  includeDeleted?: boolean;
  withAssociations?: boolean;
}

// Associations are always loaded UNFILTERED so every post carries its full set
// of categories/tags. Filtering a listing by category/tag is done at the post
// level (see taxonomyFilterConditions) so it never strips the other taxonomies
// off the returned rows.
function postAssociations(): Includeable[] {
  return [
    {
      model: Media,
      as: "featuredImage",
      attributes: ["id", "url", "fileName"],
      required: false,
    },
    {
      model: Admin,
      as: "author",
      attributes: ["id", "name", "title", "bio", "avatarUrl"],
      required: false,
    },
    {
      model: Category,
      as: "category",
      attributes: ["id", "name", "slug"],
      required: false,
    },
    {
      model: Category,
      as: "categories",
      attributes: ["id", "name", "slug"],
      through: { attributes: [] },
      required: false,
    },
    {
      model: Tag,
      attributes: ["id", "name", "slug"],
      through: { attributes: [] },
      required: false,
    },
  ];
}

// content, search_text and search_vector are three representations of the SAME
// article body, so selecting all of them ships the body three times per row.
// The list DTO (toPostSummaryResponse) reads none of them, so listings exclude
// all three; detail reads keep content and drop only the two derived copies.
// A column does NOT need to be in the SELECT list to be filtered or ordered on,
// so the search WHERE/ORDER BY below keep working untouched.
const LIST_EXCLUDED_ATTRIBUTES: string[] = ["content", "searchText", "search_vector"];
const DETAIL_EXCLUDED_ATTRIBUTES: string[] = ["searchText", "search_vector"];

// Restricts a listing to posts linked to a given category/tag slug via the
// join tables, using a subquery so the loaded `categories`/`tags` arrays stay
// complete (an include-level `where` would prune them to just the match).
function taxonomyFilterConditions(
  filters: Pick<PostListFilters, "category" | "tag">,
): WhereOptions<PostAttributes>[] {
  const conditions: WhereOptions<PostAttributes>[] = [];

  if (filters.category) {
    conditions.push({
      id: {
        [Op.in]: sequelize.literal(
          `(SELECT pc.post_id FROM post_categories pc ` +
            `INNER JOIN categories c ON c.id = pc.category_id ` +
            `WHERE c.slug = ${sequelize.escape(filters.category)})`,
        ),
      },
    });
  }

  if (filters.tag) {
    conditions.push({
      id: {
        [Op.in]: sequelize.literal(
          `(SELECT pt.post_id FROM post_tags pt ` +
            `INNER JOIN tags t ON t.id = pt.tag_id ` +
            `WHERE t.slug = ${sequelize.escape(filters.tag)})`,
        ),
      },
    });
  }

  return conditions;
}

const MAX_SEARCH_LENGTH = 100;
const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_TOKENS = 6;

// Escapes POSIX ERE metacharacters so a raw token/query is matched as a literal
// string, never as a pattern. The word-boundary anchors (\m, \M) are added
// AROUND the escaped output, so they stay live regex operators.
export function escapeRegex(value: string): string {
  return value.replace(/[.\\+*?()[\]{}^$|]/g, "\\$&");
}

// WHERE clause + ranking tiers 2/3: anchor the START of a word only. There is
// deliberately NO trailing \M and no $ — a prefix like "test1" must still match
// the word "test10", which is the whole point of the incremental navbar search.
export function buildPrefixPattern(token: string): string {
  return `\\m${escapeRegex(token)}`;
}

// Ranking tier 1 only: a complete word — start (\m) AND end (\M) anchored. \M
// appears ONLY in the ORDER BY tiers below, never in the WHERE clause.
export function buildExactWordPattern(token: string): string {
  return `\\m${escapeRegex(token)}\\M`;
}

// Ranking tier 0 only: the whole query as one complete word phrase. Interior
// whitespace becomes \s+ so any run of spaces between the words still matches.
export function buildPhrasePattern(query: string): string {
  return `\\m${escapeRegex(query).replace(/\s+/g, "\\s+")}\\M`;
}

// Normalises a raw search term into tokens, or null when the search should be
// treated as absent. Shared by the public (listPublished) and admin (adminList)
// paths so the rules stay identical: trim, cap at 100 chars, ignore terms under
// 2 chars, and keep at most 6 whitespace-separated tokens so a long query can't
// build an unbounded predicate.
export function normalizeSearchTokens(search?: string): string[] | null {
  const trimmed = search?.trim().slice(0, MAX_SEARCH_LENGTH);
  if (!trimmed || trimmed.length < MIN_SEARCH_LENGTH) {
    return null;
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TOKENS);
  return tokens.length > 0 ? tokens : null;
}

// The searchable text columns, qualified with the "Post" alias so they resolve
// inside the paginated subquery's WHERE. search_text is the HTML-stripped body
// (migration 021); when it is NULL (an incomplete backfill) we fall back to the
// raw content so search still works everywhere.
function tokenMatchesAnyColumn(escapedPattern: string): string {
  return (
    `("Post"."title" ~* ${escapedPattern} ` +
    `OR coalesce("Post"."excerpt", '') ~* ${escapedPattern} ` +
    `OR coalesce("Post"."search_text", '') ~* ${escapedPattern} ` +
    `OR ("Post"."search_text" IS NULL AND "Post"."content" ~* ${escapedPattern}))`
  );
}

// Word-start prefix match: every token must prefix-match a word in at least one
// searchable column (case-insensitive ~*). No end anchor, so typing "test1"
// still matches "test10".
function buildSearchWhere(search?: string): WhereOptions<PostAttributes> | null {
  const tokens = normalizeSearchTokens(search);
  if (!tokens) {
    return null;
  }

  const clause = tokens
    .map((token) => tokenMatchesAnyColumn(sequelize.escape(buildPrefixPattern(token))))
    .join(" AND ");

  return sequelize.literal(clause) as unknown as WhereOptions<PostAttributes>;
}

// Joins per-token conditions against one column expression with AND.
function everyTokenMatches(
  columnExpr: string,
  tokens: string[],
  patternFor: (token: string) => string,
): string {
  return tokens
    .map((token) => `${columnExpr} ~* ${sequelize.escape(patternFor(token))}`)
    .join(" AND ");
}

// Five-tier relevance ordering (lowest tier sorts first). Prefix matching in the
// WHERE means "test" returns both "Test" and "test10"; the tiers keep exact
// whole-word title matches on top. \M appears only here, never in the WHERE.
//   0: the whole query matches the title as a complete word phrase
//   1: every token is a complete word in the title
//   2: every token prefix-matches a word in the title
//   3: every token prefix-matches a word in the excerpt
//   4: body-only match
function searchRankOrders(search?: string): OrderItem[] {
  const tokens = normalizeSearchTokens(search);
  if (!tokens) {
    return [];
  }

  const phrase = sequelize.escape(buildPhrasePattern(tokens.join(" ")));
  const titleExact = everyTokenMatches(`"Post"."title"`, tokens, buildExactWordPattern);
  const titlePrefix = everyTokenMatches(`"Post"."title"`, tokens, buildPrefixPattern);
  const excerptPrefix = everyTokenMatches(
    `coalesce("Post"."excerpt", '')`,
    tokens,
    buildPrefixPattern,
  );

  return [
    sequelize.literal(
      `CASE ` +
        `WHEN "Post"."title" ~* ${phrase} THEN 0 ` +
        `WHEN ${titleExact} THEN 1 ` +
        `WHEN ${titlePrefix} THEN 2 ` +
        `WHEN ${excerptPrefix} THEN 3 ` +
        `ELSE 4 END ASC`,
    ),
  ];
}

function combineWhere(
  conditions: WhereOptions<PostAttributes>[],
): WhereOptions<PostAttributes> {
  if (conditions.length === 1) {
    return conditions[0];
  }

  return { [Op.and]: conditions };
}

export class PostRepository {
  async transaction<T>(
    callback: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    return sequelize.transaction(callback);
  }

  async create(
    payload: PostCreationAttributes,
    transaction: Transaction,
  ): Promise<Post> {
    return Post.create(payload, { transaction });
  }

  async save(post: Post, transaction?: Transaction): Promise<Post> {
    return post.save({ transaction });
  }

  async findById(
    id: string,
    options: FindPostOptions = {},
  ): Promise<Post | null> {
    return Post.findByPk(id, {
      attributes: { exclude: DETAIL_EXCLUDED_ATTRIBUTES },
      transaction: options.transaction,
      paranoid: !options.includeDeleted,
      include: options.withAssociations ? postAssociations() : undefined,
    });
  }

  async findPublishedBySlug(slug: string): Promise<Post | null> {
    return Post.findOne({
      attributes: { exclude: DETAIL_EXCLUDED_ATTRIBUTES },
      where: {
        slug,
        status: PostStatus.PUBLISHED,
      },
      include: postAssociations(),
    });
  }

  async slugExists(
    slug: string,
    excludePostId?: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const where: WhereOptions<PostAttributes> = excludePostId
      ? { slug, id: { [Op.ne]: excludePostId } }
      : { slug };
    const existing = await Post.findOne({
      attributes: ["id"],
      where,
      transaction,
      paranoid: false,
    });
    return existing !== null;
  }

  async listPublished(filters: PostListFilters): Promise<PaginatedPosts> {
    const conditions: WhereOptions<PostAttributes>[] = [{
      status: PostStatus.PUBLISHED,
    }];
    const searchWhere = buildSearchWhere(filters.search);

    if (typeof filters.featured === "boolean") {
      conditions.push({ featured: filters.featured });
    }

    if (searchWhere) {
      conditions.push(searchWhere);
    }

    conditions.push(...taxonomyFilterConditions(filters));

    // Relevance tier first (when searching), then newest-first. published_at is
    // nullable and Postgres sorts NULLs first on DESC, so force NULLS LAST.
    // ["id","DESC"] is a stable tiebreaker so posts sharing a timestamp aren't
    // duplicated or skipped across page boundaries.
    const order: Order = [
      ...searchRankOrders(filters.search),
      ["publishedAt", "DESC NULLS LAST"],
      ["id", "DESC"],
    ];

    return Post.findAndCountAll(
      this.paginatedFindOptions(filters, combineWhere(conditions), order),
    );
  }

  async listFeatured(page: number, limit: number): Promise<PaginatedPosts> {
    return this.listPublished({ page, limit, featured: true });
  }

  async adminList(filters: AdminPostListFilters): Promise<PaginatedPosts> {
    const conditions: WhereOptions<PostAttributes>[] = [];
    const searchWhere = buildSearchWhere(filters.search);

    if (searchWhere) {
      conditions.push(searchWhere);
    }

    if (filters.status) {
      conditions.push({ status: filters.status });
    }

    return Post.findAndCountAll({
      ...this.paginatedFindOptions(
        filters,
        conditions.length > 0 ? combineWhere(conditions) : {},
        // ["id","DESC"] is a stable tiebreaker so posts sharing a createdAt
        // aren't duplicated or skipped across page boundaries.
        [["createdAt", "DESC"], ["id", "DESC"]],
      ),
      paranoid: !filters.includeDeleted,
    });
  }

  async incrementViewCount(postId: string): Promise<void> {
    await Post.increment("viewCount", {
      by: 1,
      where: { id: postId },
    });
  }

  async replaceCategories(
    postId: string,
    categoryIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    await PostCategory.destroy({ where: { postId }, transaction });

    if (categoryIds.length === 0) {
      return;
    }

    await PostCategory.bulkCreate(
      categoryIds.map((categoryId) => ({ postId, categoryId })),
      { transaction },
    );
  }

  async replaceTags(
    postId: string,
    tagIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    await PostTag.destroy({ where: { postId }, transaction });

    if (tagIds.length === 0) {
      return;
    }

    await PostTag.bulkCreate(
      tagIds.map((tagId) => ({ postId, tagId })),
      { transaction },
    );
  }

  async categoryIdsExist(
    categoryIds: string[],
    transaction?: Transaction,
  ): Promise<boolean> {
    if (categoryIds.length === 0) {
      return true;
    }

    const count = await Category.count({
      where: { id: { [Op.in]: categoryIds } },
      transaction,
    });
    return count === categoryIds.length;
  }

  async tagIdsExist(
    tagIds: string[],
    transaction?: Transaction,
  ): Promise<boolean> {
    if (tagIds.length === 0) {
      return true;
    }

    const count = await Tag.count({
      where: { id: { [Op.in]: tagIds } },
      transaction,
    });
    return count === tagIds.length;
  }

  async softDelete(post: Post, transaction: Transaction): Promise<void> {
    await post.destroy({ transaction });
  }

  async restore(post: Post, transaction: Transaction): Promise<void> {
    await post.restore({ transaction });
  }

  private paginatedFindOptions(
    filters: Pick<PostListFilters, "page" | "limit" | "category" | "tag">,
    where: WhereOptions<PostAttributes>,
    order: Order,
  ): FindAndCountOptions<PostAttributes> {
    return {
      attributes: { exclude: LIST_EXCLUDED_ATTRIBUTES },
      where,
      offset: (filters.page - 1) * filters.limit,
      limit: filters.limit,
      order,
      include: postAssociations(),
      distinct: true,
    };
  }
}

const postRepository = new PostRepository();

export default postRepository;
