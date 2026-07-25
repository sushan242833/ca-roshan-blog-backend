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

// Text search configuration — MUST match the generated column in migration 022.
const SEARCH_CONFIG = "english";

// Input hygiene retained from the ILIKE era. tsquery no longer treats %, _ or \
// as special, but neutralising them one-for-one keeps the term predictable and
// costs nothing for ordinary word queries.
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Normalises a raw search term into tokens, or null when the search should be
// treated as absent. Shared by the public (listPublished) and admin (adminList)
// paths so the rules stay identical: trim, cap at 100 chars, ignore terms under
// 2 chars, and keep at most 6 whitespace-separated tokens so a long query can't
// build an unbounded predicate.
function normalizeSearchTokens(search?: string): string[] | null {
  const trimmed = search?.trim().slice(0, MAX_SEARCH_LENGTH);
  if (!trimmed || trimmed.length < MIN_SEARCH_LENGTH) {
    return null;
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TOKENS);
  return tokens.length > 0 ? tokens : null;
}

// Builds the shared websearch_to_tsquery(...) SQL expression, or null when there
// is no usable term. websearch_to_tsquery (not to_tsquery) accepts arbitrary
// user input — stray quotes, unbalanced quotes, bare boolean operators —
// without raising a syntax error. The term is passed through sequelize.escape,
// never string-concatenated.
function buildTsQuery(search?: string): string | null {
  const tokens = normalizeSearchTokens(search);
  if (!tokens) {
    return null;
  }

  const term = tokens.map(escapeLikePattern).join(" ");
  return `websearch_to_tsquery('${SEARCH_CONFIG}', ${sequelize.escape(term)})`;
}

// Full-text match against the weighted, GIN-indexed search_vector (migration
// 022) — a bitmap index scan, replacing the previous unindexed ILIKE substring
// scan entirely. Qualified with the "Post" alias so it is unambiguous inside
// the paginated subquery.
function buildSearchWhere(search?: string): WhereOptions<PostAttributes> | null {
  const tsQuery = buildTsQuery(search);
  if (!tsQuery) {
    return null;
  }

  return sequelize.literal(
    `"Post"."search_vector" @@ ${tsQuery}`,
  ) as unknown as WhereOptions<PostAttributes>;
}

// Relevance ordering, focused on the topic (title):
//   1. Posts whose TITLE matches the query rank above posts that only match in
//      the excerpt or body — ts_rank_cd alone lets many body occurrences
//      (weight C) outweigh a single title hit (weight A), which is not what a
//      "search by topic name" should do.
//   2. Within each tier, order by cover-density relevance over the full vector.
// Returns [] when there is no usable search term.
function searchRankOrders(search?: string): OrderItem[] {
  const tsQuery = buildTsQuery(search);
  if (!tsQuery) {
    return [];
  }

  return [
    sequelize.literal(
      `(to_tsvector('${SEARCH_CONFIG}', "Post"."title") @@ ${tsQuery}) DESC`,
    ),
    sequelize.literal(`ts_rank_cd("Post"."search_vector", ${tsQuery}) DESC`),
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
      transaction: options.transaction,
      paranoid: !options.includeDeleted,
      include: options.withAssociations ? postAssociations() : undefined,
    });
  }

  async findPublishedBySlug(slug: string): Promise<Post | null> {
    return Post.findOne({
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
