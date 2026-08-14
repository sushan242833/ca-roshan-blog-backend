import { Media, MediaCreationAttributes, MediaProvider } from "./media.model";
import mediaRepository, { MediaRepository } from "./media.repository";
import {
  MediaKind,
  UploadMediaDto,
  assertContentMatchesMimeType,
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

// Resolved once at module load so a bad Cloudinary config surfaces at boot
// rather than on the first upload. Tests still inject their own provider.
const defaultStorage = resolveStorage();

export class MediaService {
  constructor(
    private readonly repository: MediaRepository = mediaRepository,
    private readonly storageProvider: StorageProvider = defaultStorage.provider,
    private readonly provider: MediaProvider = defaultStorage.mediaProvider,
  ) {}

  async upload(dto: UploadMediaDto): Promise<Media> {
    assertUploadMediaDto(dto);
    // Runs before the buffer reaches storage, so a file whose bytes contradict
    // its declared Content-Type is never written anywhere.
    await assertContentMatchesMimeType(dto.buffer, dto.mimeType);

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

  async listAll(kind?: MediaKind): Promise<Media[]> {
    return this.repository.findAll(kind);
  }

  async list(
    page: number,
    limit: number,
    kind?: MediaKind,
  ): Promise<{ items: Media[]; total: number; page: number; limit: number }> {
    const { rows, count } = await this.repository.findPaginated(
      page,
      limit,
      kind,
    );
    return { items: rows, total: count, page, limit };
  }

  async getById(id: string): Promise<Media> {
    const { id: mediaId } = toMediaIdParamDto(id);
    const media = await this.repository.findById(mediaId);

    if (!media) {
      throw new NotFoundError("Media not found.");
    }

    return media;
  }

  /**
   * Deletes a media asset, refusing when a post still points at it.
   *
   * Two problems are fixed here. First, nothing checked for references, so
   * deleting an image left a broken featured image or a dead <img> in a
   * published article. Second, the storage object was destroyed *before* the
   * database row — an irreversible operation ahead of a reversible one, which
   * made the "soft" delete a lie and left no way back if the row update then
   * failed. The order is now: check, soft-delete the row, then destroy the
   * bytes.
   */
  async deleteById(id: string): Promise<void> {
    const media = await this.getById(id);

    const references = await this.repository.findReferencingPosts(media);
    if (references.length > 0) {
      const titles = references.map((post) => `"${post.title}"`).join(", ");
      throw new ConflictError(
        `This file is still used by ${references.length} post(s): ${titles}. ` +
          "Remove it from those posts before deleting it.",
      );
    }

    const deleted = await this.repository.softDeleteById(media.id);
    if (!deleted) {
      throw new InternalServerError("Failed to delete media.");
    }

    // Last, and non-fatal: the record is already gone from the library, so a
    // storage hiccup should not fail the request. Worst case is an orphaned
    // object in the bucket, which is recoverable; the reverse is not.
    await this.storageProvider.delete(media.fileName).catch((error: unknown) => {
      console.error(
        `Media row ${media.id} soft-deleted but storage object ${media.fileName} was not removed:`,
        error,
      );
    });
  }
}

const mediaService = new MediaService();

export default mediaService;
