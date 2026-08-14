import { Model, ModelStatic, Op, Transaction } from "sequelize";
import { sequelize } from "@models/index";
import { ConflictError, NotFoundError } from "@errors/http-error";
import { slugify } from "@utils/index";

export interface SlugEntityAttributes {
  id: string;
  name: string;
  slug: string;
}

export interface SlugEntityCreateDto {
  name: string;
  slug?: string;
  description?: string | null;
}

export interface SlugEntityUpdateDto {
  name?: string;
  slug?: string;
  description?: string | null;
}

/**
 * Shared CRUD + unique-slug logic for simple name/slug entities
 * (e.g. Category, Tag). Subclasses add entity-specific read methods.
 */
export class SlugEntityService<TModel extends Model & SlugEntityAttributes> {
  constructor(
    private readonly model: ModelStatic<TModel>,
    private readonly entityName: string,
  ) {}

  protected async generateUniqueSlug(
    name: string,
    transaction: Transaction,
  ): Promise<string> {
    const base = slugify(name, this.entityName.toLowerCase());
    let slug = base;
    let idx = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.model.findOne({ where: { slug } as any, transaction })) {
      slug = `${base}-${idx}`;
      idx += 1;
    }
    return slug;
  }

  async create(dto: SlugEntityCreateDto): Promise<TModel> {
    return sequelize.transaction(async (t) => {
      const slug = dto.slug
        ? slugify(dto.slug, this.entityName.toLowerCase())
        : await this.generateUniqueSlug(dto.name, t);
      const existing = await this.model.findOne({
        where: { slug } as any,
        transaction: t,
      });
      if (existing)
        throw new ConflictError(`${this.entityName} slug already exists.`);
      const entity = await this.model.create(
        {
          name: dto.name,
          slug,
          // Only pass description through when the caller supplied it, so
          // entities without a description column (e.g. Tag) are unaffected.
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
        } as any,
        { transaction: t },
      );
      return entity;
    });
  }

  async update(id: string, dto: SlugEntityUpdateDto): Promise<TModel> {
    return sequelize.transaction(async (t) => {
      const entity = await this.model.findByPk(id, { transaction: t });
      if (!entity) throw new NotFoundError(`${this.entityName} not found.`);
      if (dto.name) entity.name = dto.name;
      if (dto.description !== undefined) {
        (entity as any).description = dto.description;
      }
      if (dto.slug) {
        const newSlug = slugify(dto.slug, this.entityName.toLowerCase());
        const existing = await this.model.findOne({
          where: { slug: newSlug, id: { [Op.ne]: id } } as any,
          transaction: t,
        });
        if (existing)
          throw new ConflictError(`${this.entityName} slug already exists.`);
        entity.slug = newSlug;
      }
      await entity.save({ transaction: t });
      return entity;
    });
  }

  async delete(id: string): Promise<boolean> {
    return sequelize.transaction(async (t) => {
      const entity = await this.model.findByPk(id, { transaction: t });
      if (!entity) throw new NotFoundError(`${this.entityName} not found.`);
      await entity.destroy({ transaction: t });
      return true;
    });
  }
}

export default SlugEntityService;
