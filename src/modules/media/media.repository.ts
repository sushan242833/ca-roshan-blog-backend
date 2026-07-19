import { Op, Transaction, WhereOptions } from "sequelize";
import { Media, MediaAttributes, MediaCreationAttributes } from "./media.model";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  MediaKind,
} from "./media.dto";

export class MediaRepository {
  async create(payload: MediaCreationAttributes): Promise<Media> {
    return Media.create(payload);
  }

  async findAll(kind?: MediaKind): Promise<Media[]> {
    const where: WhereOptions<MediaAttributes> | undefined =
      kind === undefined
        ? undefined
        : {
            mimeType: {
              [Op.in]:
                kind === "document"
                  ? [...ALLOWED_DOCUMENT_MIME_TYPES]
                  : [...ALLOWED_IMAGE_MIME_TYPES],
            },
          };

    return Media.findAll({
      where,
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
