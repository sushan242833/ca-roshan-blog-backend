import { Media, MediaCreationAttributes, MediaProvider } from "./media.model";
import mediaRepository, { MediaRepository } from "./media.repository";
import {
  UploadMediaDto,
  assertUploadMediaDto,
  toMediaIdParamDto,
} from "./media.dto";
import {
  InternalServerError,
  NotFoundError,
} from "./media.errors";
import { StorageProvider } from "./storage/storage-provider.interface";
import { LocalStorageProvider } from "./storage/local-storage.provider";

export class MediaService {
  constructor(
    private readonly repository: MediaRepository = mediaRepository,
    private readonly storageProvider: StorageProvider = new LocalStorageProvider(),
    private readonly provider: MediaProvider = MediaProvider.LOCAL,
  ) {}

  async upload(dto: UploadMediaDto): Promise<Media> {
    assertUploadMediaDto(dto);

    const uploadedUrl = await this.storageProvider.upload({
      fileName: dto.fileName,
      buffer: dto.buffer,
      mimeType: dto.mimeType,
      size: dto.size,
    });

    const createPayload: MediaCreationAttributes = {
      fileName: dto.fileName,
      originalName: dto.originalName,
      mimeType: dto.mimeType,
      size: dto.size,
      url: uploadedUrl,
      provider: this.provider,
    };

    try {
      return await this.repository.create(createPayload);
    } catch (error: unknown) {
      await this.storageProvider.delete(dto.fileName).catch(() => undefined);
      throw new InternalServerError("Failed to persist media metadata.");
    }
  }

  async listAll(): Promise<Media[]> {
    return this.repository.findAll();
  }

  async getById(id: string): Promise<Media> {
    const { id: mediaId } = toMediaIdParamDto(id);
    const media = await this.repository.findById(mediaId);

    if (!media) {
      throw new NotFoundError("Media not found.");
    }

    return media;
  }

  async deleteById(id: string): Promise<void> {
    const media = await this.getById(id);

    await this.storageProvider.delete(media.fileName);
    const deleted = await this.repository.softDeleteById(media.id);

    if (!deleted) {
      throw new InternalServerError("Failed to delete media.");
    }
  }
}

const mediaService = new MediaService();

export default mediaService;
