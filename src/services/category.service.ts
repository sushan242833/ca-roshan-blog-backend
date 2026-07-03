import { QueryTypes } from "sequelize";
import { sequelize, Category } from "@models/index";
import { CreateCategoryDto } from "@dto/create-category.dto";
import { UpdateCategoryDto } from "@dto/update-category.dto";
import { NotFoundError } from "@errors/http-error";
import SlugEntityService from "@services/base/slug-entity.service";

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

class CategoryService {
  private readonly base = new SlugEntityService<Category>(Category, "Category");

  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.base.create(dto);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return this.base.update(id, dto);
  }

  async delete(id: string): Promise<boolean> {
    return this.base.delete(id);
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
