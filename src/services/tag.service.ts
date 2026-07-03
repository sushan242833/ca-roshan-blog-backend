import { Tag } from "@models/index";
import { CreateTagDto } from "@dto/create-tag.dto";
import { UpdateTagDto } from "@dto/update-tag.dto";
import SlugEntityService from "@services/base/slug-entity.service";

class TagService {
  private readonly base = new SlugEntityService<Tag>(Tag, "Tag");

  async create(dto: CreateTagDto): Promise<Tag> {
    return this.base.create(dto);
  }

  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    return this.base.update(id, dto);
  }

  async delete(id: string): Promise<boolean> {
    return this.base.delete(id);
  }

  async getAll(): Promise<Tag[]> {
    const tags = await Tag.findAll({ order: [["name", "ASC"]] });
    return tags;
  }
}

export default new TagService();
