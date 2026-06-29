import { Op, QueryTypes, Transaction } from "sequelize";
import { sequelize, Category } from "@models/index";
import { CreateCategoryDto } from "@dto/create-category.dto";
import { UpdateCategoryDto } from "@dto/update-category.dto";
import { ConflictError, NotFoundError } from "@errors/http-error";
import { slugify } from "@utils/index";

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

class CategoryService {
  private async generateUniqueSlug(name: string, transaction: Transaction): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let idx = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await Category.findOne({ where: { slug }, transaction })) {
      slug = `${base}-${idx}`;
      idx += 1;
    }
    return slug;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    return sequelize.transaction(async (t) => {
      const slug = dto.slug
        ? slugify(dto.slug)
        : await this.generateUniqueSlug(dto.name, t);
      const existing = await Category.findOne({
        where: { slug },
        transaction: t,
      });
      if (existing)
        throw new ConflictError("Category slug already exists.");
      const category = await Category.create(
        { name: dto.name, slug },
        { transaction: t },
      );
      return category;
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return sequelize.transaction(async (t) => {
      const category = await Category.findByPk(id, { transaction: t });
      if (!category) throw new NotFoundError("Category not found.");
      if (dto.name) category.name = dto.name;
      if (dto.slug) {
        const newSlug = slugify(dto.slug);
        const existing = await Category.findOne({
          where: { slug: newSlug, id: { [Op.ne]: id } },
          transaction: t,
        });
        if (existing)
          throw new ConflictError("Category slug already exists.");
        category.slug = newSlug;
      }
      await category.save({ transaction: t });
      return category;
    });
  }

  async delete(id: string): Promise<boolean> {
    return sequelize.transaction(async (t) => {
      const category = await Category.findByPk(id, { transaction: t });
      if (!category) throw new NotFoundError("Category not found.");
      await category.destroy({ transaction: t });
      return true;
    });
  }

  async getAll(): Promise<CategoryWithCount[]> {
    const [categories, countRows] = await Promise.all([
      Category.findAll({ order: [["name", "ASC"]] }),
      sequelize.query<{ category_id: string; post_count: number }>(
        `
          SELECT pc.category_id,
                 COUNT(p.id)::int AS post_count
          FROM post_categories pc
          INNER JOIN posts p ON p.id = pc.post_id
          WHERE p.status = 'PUBLISHED'
            AND p.deleted_at IS NULL
          GROUP BY pc.category_id
        `,
        { type: QueryTypes.SELECT },
      ),
    ]);

    const countMap = new Map<string, number>(
      countRows.map((row) => [row.category_id, row.post_count]),
    );

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      postCount: countMap.get(cat.id) ?? 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));
  }

  async getBySlug(slug: string): Promise<Category> {
    const category = await Category.findOne({ where: { slug } });
    if (!category) throw new NotFoundError("Category not found.");
    return category;
  }
}

export default new CategoryService();
