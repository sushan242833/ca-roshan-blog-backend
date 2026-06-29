import {
  FindAndCountOptions,
  Includeable,
  Op,
  Order,
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

function postAssociations(
  filters?: Pick<PostListFilters, "category" | "tag">,
): Includeable[] {
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
      required: Boolean(filters?.category),
      where: filters?.category ? { slug: filters.category } : undefined,
    },
    {
      model: Tag,
      attributes: ["id", "name", "slug"],
      through: { attributes: [] },
      required: Boolean(filters?.tag),
      where: filters?.tag ? { slug: filters.tag } : undefined,
    },
  ];
}

function buildSearchWhere(search?: string): WhereOptions<PostAttributes> | null {
  const trimmedSearch = search?.trim();
  if (!trimmedSearch) {
    return null;
  }

  const pattern = `%${trimmedSearch}%`;
  return {
    [Op.or]: [
      { title: { [Op.iLike]: pattern } },
      { excerpt: { [Op.iLike]: pattern } },
    ],
  };
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

    return Post.findAndCountAll(
      this.paginatedFindOptions(filters, combineWhere(conditions), [
        ["publishedAt", "DESC"],
      ]),
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

    return Post.findAndCountAll({
      ...this.paginatedFindOptions(
        filters,
        conditions.length > 0 ? combineWhere(conditions) : {},
        [["createdAt", "DESC"]],
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
      include: postAssociations(filters),
      distinct: true,
    };
  }
}

const postRepository = new PostRepository();

export default postRepository;
