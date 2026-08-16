import { Media, MediaCreationAttributes, MediaProvider } from "./media.model";
import mediaRepository, { MediaRepository } from "./media.repository";
import {
  MediaKind,
  UploadMediaDto,
  assertUploadMediaDto,
  toMediaIdParamDto,
} from "./media.dto";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "./media.errors";
import { StorageProvider } from "./storage/storage-provider.interface";
import { resolveStorage } from "./storage/storage-provider.factory";
import mediaUsageService, {
  MediaUsage,
  MediaUsageService,
  describeMediaUsage,
} from "./media.usage";

// Resolved once at module load so a bad Cloudinary config surfaces at boot
// rather than on the first upload. Tests still inject their own provider.
const defaultStorage = resolveStorage();

// A media row plus whether anything in the project still points at it.
export interface MediaListItem {
  media: Media;
  inUse: boolean;
}

export class MediaService {
  constructor(
    private readonly repository: MediaRepository = mediaRepository,
    private readonly storageProvider: StorageProvider = defaultStorage.provider,
    private readonly provider: MediaProvider = defaultStorage.mediaProvider,
    private readonly usage: MediaUsageService = mediaUsageService,
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

  // The listing carries the in-use flag so the library can mark (and protect)
  // referenced files without asking about each one separately.
  async listAll(kind?: MediaKind): Promise<MediaListItem[]> {
    const [items, usageIndex] = await Promise.all([
      this.repository.findAll(kind),
      this.usage.buildIndex(),
    ]);

    return items.map((media) => ({ media, inUse: usageIndex.isUsed(media) }));
  }

  async getById(id: string): Promise<Media> {
    const { id: mediaId } = toMediaIdParamDto(id);
    const media = await this.repository.findById(mediaId);

    if (!media) {
      throw new NotFoundError("Media not found.");
    }

    return media;
  }

  async getByIdWithUsage(id: string): Promise<MediaListItem> {
    const media = await this.getById(id);
    const usage = await this.usage.find(media);

    return { media, inUse: usage.inUse };
  }

  async getUsage(id: string): Promise<MediaUsage> {
    const media = await this.getById(id);
    return this.usage.find(media);
  }

  // Deleting is only allowed for a file nothing points at. Media referenced by
  // a post — published, draft, archived, or trashed — stays put, because the
  // delete is destructive: the underlying file leaves storage and the post that
  // used it would render a broken image with no way back.
  async deleteById(id: string): Promise<void> {
    const media = await this.getById(id);
    const usage = await this.usage.find(media);

    if (usage.inUse) {
      throw new ConflictError(
        `“${media.originalName}” is in use and cannot be deleted. It is used by ${describeMediaUsage(usage)}. Remove it there first, then delete it here.`,
        usage,
      );
    }

    await this.storageProvider.delete(media.fileName);
    const deleted = await this.repository.softDeleteById(media.id);

    if (!deleted) {
      throw new InternalServerError("Failed to delete media.");
    }
  }
}

const mediaService = new MediaService();

export default mediaService;
