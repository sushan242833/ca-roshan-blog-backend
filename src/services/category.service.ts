import { Op } from "sequelize";
import { sequelize, Category } from "@models/index";
import { CreateCategoryDto } from "@dto/create-category.dto";
import { UpdateCategoryDto } from "@dto/update-category.dto";
import { ConflictError, NotFoundError } from "@errors/http-error";

function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class CategoryService {
  async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let idx = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await Category.findOne({ where: { slug } })) {
      slug = `${base}-${idx}`;
      idx += 1;
    }
    return slug;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    return sequelize.transaction(async (t) => {
      const slug = dto.slug
        ? slugify(dto.slug)
        : await this.generateUniqueSlug(dto.name);
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

  async getAll(): Promise<Category[]> {
    const categories = await Category.findAll({ order: [["name", "ASC"]] });
    return categories;
  }

  async getBySlug(slug: string): Promise<Category> {
    const category = await Category.findOne({ where: { slug } });
    if (!category) throw new NotFoundError("Category not found.");
    return category;
  }
}

export default new CategoryService();
