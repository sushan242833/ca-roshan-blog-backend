import { Transaction } from "sequelize";
import { Media, MediaCreationAttributes } from "./media.model";

export class MediaRepository {
  async create(payload: MediaCreationAttributes): Promise<Media> {
    return Media.create(payload);
  }

  async findAll(): Promise<Media[]> {
    return Media.findAll({
      order: [["createdAt", "DESC"]],
    });
  }

  async findById(id: string, transaction?: Transaction): Promise<Media | null> {
    return Media.findByPk(id, { transaction });
  }

  async softDeleteById(id: string): Promise<boolean> {
    const deletedCount = await Media.destroy({ where: { id } });
    return deletedCount > 0;
  }
}

const mediaRepository = new MediaRepository();

export default mediaRepository;
