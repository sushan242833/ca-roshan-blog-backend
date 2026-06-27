import { Op, Transaction } from "sequelize";
import { sequelize, Tag } from "@models/index";
import { CreateTagDto } from "@dto/create-tag.dto";
import { UpdateTagDto } from "@dto/update-tag.dto";
import { ConflictError, NotFoundError } from "@errors/http-error";
import { slugify } from "@utils/index";

class TagService {
  private async generateUniqueSlug(name: string, transaction: Transaction): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let idx = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await Tag.findOne({ where: { slug }, transaction })) {
      slug = `${base}-${idx}`;
      idx += 1;
    }
    return slug;
  }

  async create(dto: CreateTagDto): Promise<Tag> {
    return sequelize.transaction(async (t) => {
      const slug = dto.slug
        ? slugify(dto.slug)
        : await this.generateUniqueSlug(dto.name, t);
      const existing = await Tag.findOne({ where: { slug }, transaction: t });
      if (existing) throw new ConflictError("Tag slug already exists.");
      const tag = await Tag.create(
        { name: dto.name, slug },
        { transaction: t },
      );
      return tag;
    });
  }

  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    return sequelize.transaction(async (t) => {
      const tag = await Tag.findByPk(id, { transaction: t });
      if (!tag) throw new NotFoundError("Tag not found.");
      if (dto.name) tag.name = dto.name;
      if (dto.slug) {
        const newSlug = slugify(dto.slug);
        const existing = await Tag.findOne({
          where: { slug: newSlug, id: { [Op.ne]: id } },
          transaction: t,
        });
        if (existing) throw new ConflictError("Tag slug already exists.");
        tag.slug = newSlug;
      }
      await tag.save({ transaction: t });
      return tag;
    });
  }

  async delete(id: string): Promise<boolean> {
    return sequelize.transaction(async (t) => {
      const tag = await Tag.findByPk(id, { transaction: t });
      if (!tag) throw new NotFoundError("Tag not found.");
      await tag.destroy({ transaction: t });
      return true;
    });
  }

  async getAll(): Promise<Tag[]> {
    const tags = await Tag.findAll({ order: [["name", "ASC"]] });
    return tags;
  }
}

export default new TagService();
