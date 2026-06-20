import { Op } from "sequelize";
import {
  sequelize,
  Post,
  PostCategory,
  PostTag,
  Category,
  Tag,
} from "@models/index";
import { CreatePostDto } from "@dto/create-post.dto";
import { UpdatePostDto } from "@dto/update-post.dto";

function slugify(input: string) {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class PostService {
  async generateUniqueSlug(title: string) {
    const base = slugify(title);
    let slug = base;
    let idx = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await Post.findOne({ where: { slug } })) {
      slug = `${base}-${idx}`;
      idx += 1;
    }
    return slug;
  }

  async create(adminId: string, dto: CreatePostDto) {
    return sequelize.transaction(async (t) => {
      const slug = await this.generateUniqueSlug(dto.title);
      const post = await Post.create(
        {
          title: dto.title,
          content: dto.content,
          slug,
          adminId,
          publishedAt: dto.published ? new Date() : null,
        },
        { transaction: t },
      );

      if (dto.categoryIds && dto.categoryIds.length) {
        const entries = dto.categoryIds.map((cid) => ({
          postId: post.id,
          categoryId: cid,
        }));
        // bulk insert
        // @ts-ignore
        await PostCategory.bulkCreate(entries, { transaction: t });
      }

      if (dto.tagIds && dto.tagIds.length) {
        const entries = dto.tagIds.map((tid) => ({
          postId: post.id,
          tagId: tid,
        }));
        // @ts-ignore
        await PostTag.bulkCreate(entries, { transaction: t });
      }

      return post;
    });
  }

  async update(postId: string, dto: UpdatePostDto) {
    return sequelize.transaction(async (t) => {
      const post = await Post.findByPk(postId, { transaction: t });
      if (!post) throw { status: 404, message: "Post not found" };

      if (dto.title && dto.title !== post.title) {
        post.title = dto.title;
        post.slug = await this.generateUniqueSlug(dto.title);
      }

      if (typeof dto.content !== "undefined")
        post.content = dto.content as string;

      if (typeof dto.published !== "undefined")
        post.publishedAt = dto.published ? new Date() : null;

      await post.save({ transaction: t });

      if (dto.categoryIds) {
        await PostCategory.destroy({
          where: { postId: post.id },
          transaction: t,
        });
        if (dto.categoryIds.length) {
          const entries = dto.categoryIds.map((cid) => ({
            postId: post.id,
            categoryId: cid,
          }));
          // @ts-ignore
          await PostCategory.bulkCreate(entries, { transaction: t });
        }
      }

      if (dto.tagIds) {
        await PostTag.destroy({ where: { postId: post.id }, transaction: t });
        if (dto.tagIds.length) {
          const entries = dto.tagIds.map((tid) => ({
            postId: post.id,
            tagId: tid,
          }));
          // @ts-ignore
          await PostTag.bulkCreate(entries, { transaction: t });
        }
      }

      return post;
    });
  }

  async softDelete(postId: string) {
    return sequelize.transaction(async (t) => {
      const post = await Post.findByPk(postId, { transaction: t });
      if (!post) throw { status: 404, message: "Post not found" };
      await post.destroy({ transaction: t });
      return true;
    });
  }

  async publish(postId: string) {
    const post = await Post.findByPk(postId);
    if (!post) throw { status: 404, message: "Post not found" };
    post.publishedAt = new Date();
    await post.save();
    return post;
  }

  async unpublish(postId: string) {
    const post = await Post.findByPk(postId);
    if (!post) throw { status: 404, message: "Post not found" };
    post.publishedAt = null;
    await post.save();
    return post;
  }

  async getPublished(page = 1, limit = 10, q?: string) {
    const where: any = { publishedAt: { [Op.ne]: null } };
    if (q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { content: { [Op.iLike]: `%${q}%` } },
      ];
    }
    const offset = (page - 1) * limit;
    const { rows, count } = await Post.findAndCountAll({
      where,
      offset,
      limit,
      order: [["published_at", "DESC"]],
      include: [Category, Tag],
    });
    return {
      data: rows,
      meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
    };
  }

  async getBySlug(slug: string) {
    const post = await Post.findOne({
      where: { slug, publishedAt: { [Op.ne]: null } },
      include: [Category, Tag],
    });
    if (!post) throw { status: 404, message: "Post not found" };
    return post;
  }

  async adminList(page = 1, limit = 20, q?: string, includeDeleted = false) {
    const where: any = {};
    if (q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { content: { [Op.iLike]: `%${q}%` } },
      ];
    }
    const offset = (page - 1) * limit;
    const { rows, count } = await Post.findAndCountAll({
      where,
      offset,
      limit,
      order: [["created_at", "DESC"]],
      include: [Category, Tag],
      paranoid: !includeDeleted,
    });
    return {
      data: rows,
      meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
    };
  }
}

export default new PostService();
