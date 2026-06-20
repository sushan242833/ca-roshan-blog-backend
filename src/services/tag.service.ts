import { Op } from "sequelize";
import { sequelize, Tag } from "@models/index";
import { CreateTagDto } from "@dto/create-tag.dto";
import { UpdateTagDto } from "@dto/update-tag.dto";

function slugify(input: string) {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class TagService {
  async generateUniqueSlug(name: string) {
    const base = slugify(name);
    let slug = base;
    let idx = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await Tag.findOne({ where: { slug } })) {
      slug = `${base}-${idx}`;
      idx += 1;
    }
    return slug;
  }

  async create(dto: CreateTagDto) {
    return sequelize.transaction(async (t) => {
      const slug = dto.slug
        ? slugify(dto.slug)
        : await this.generateUniqueSlug(dto.name);
      const existing = await Tag.findOne({ where: { slug }, transaction: t });
      if (existing) throw { status: 409, message: "Tag slug already exists" };
      const tag = await Tag.create(
        { name: dto.name, slug },
        { transaction: t },
      );
      return tag;
    });
  }

  async update(id: string, dto: UpdateTagDto) {
    return sequelize.transaction(async (t) => {
      const tag = await Tag.findByPk(id, { transaction: t });
      if (!tag) throw { status: 404, message: "Tag not found" };
      if (dto.name) tag.name = dto.name;
      if (dto.slug) {
        const newSlug = slugify(dto.slug);
        const existing = await Tag.findOne({
          where: { slug: newSlug, id: { [Op.ne]: id } },
          transaction: t,
        });
        if (existing) throw { status: 409, message: "Tag slug already exists" };
        tag.slug = newSlug;
      }
      await tag.save({ transaction: t });
      return tag;
    });
  }

  async delete(id: string) {
    return sequelize.transaction(async (t) => {
      const tag = await Tag.findByPk(id, { transaction: t });
      if (!tag) throw { status: 404, message: "Tag not found" };
      await tag.destroy({ transaction: t });
      return true;
    });
  }

  async getAll() {
    const tags = await Tag.findAll({ order: [["name", "ASC"]] });
    return tags;
  }
}

export default new TagService();
