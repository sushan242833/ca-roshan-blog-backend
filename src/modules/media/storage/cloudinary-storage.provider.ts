import path from "path";
import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiResponse,
} from "cloudinary";
import { env } from "@config/env";
import { assertStoredFileName } from "../media.dto";
import { BadRequestError, InternalServerError } from "../media.errors";
import {
  StorageProvider,
  StorageUploadFile,
} from "./storage-provider.interface";

// Cloudinary splits assets by resource_type and the type used at upload must be
// repeated at destroy time, or the delete silently succeeds while the asset
// stays. Images go to "image" so the delivery CDN can transform them; PDFs go
// to "raw" so they are served byte-for-byte with no transformation attempt.
type CloudinaryResourceType = "image" | "raw";

function resourceTypeFor(fileName: string): CloudinaryResourceType {
  return path.extname(fileName).toLowerCase() === ".pdf" ? "raw" : "image";
}

// public_id excludes the extension for images (Cloudinary appends the delivered
// format itself) but includes it for raw assets, which are addressed verbatim.
function publicIdFor(fileName: string, folder: string): string {
  const isRaw = resourceTypeFor(fileName) === "raw";
  const base = isRaw ? fileName : path.parse(fileName).name;
  return folder ? `${folder}/${base}` : base;
}

export class CloudinaryStorageProvider implements StorageProvider {
  private readonly folder: string;

  constructor(
    cloudName = env.CLOUDINARY_CLOUD_NAME,
    apiKey = env.CLOUDINARY_API_KEY,
    apiSecret = env.CLOUDINARY_API_SECRET,
    folder = env.CLOUDINARY_FOLDER,
  ) {
    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerError("Cloudinary credentials are not configured.");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.folder = folder.replace(/^\/+|\/+$/g, "");
  }

  async upload(file: StorageUploadFile): Promise<string> {
    // Reuses the same filename validation as the local provider, so a crafted
    // name cannot reach Cloudinary's public_id either.
    assertStoredFileName(file.fileName);

    const resourceType = resourceTypeFor(file.fileName);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicIdFor(file.fileName, this.folder),
          resource_type: resourceType,
          // The filename already carries a UUID, so a collision means a bug
          // rather than a duplicate upload. Refuse to overwrite so an existing
          // asset can never be silently replaced.
          overwrite: false,
        },
        (
          error: UploadApiErrorResponse | undefined,
          uploaded: UploadApiResponse | undefined,
        ) => {
          if (error) return reject(error);
          if (!uploaded) {
            return reject(new Error("Cloudinary returned no upload result."));
          }
          return resolve(uploaded);
        },
      );

      stream.end(file.buffer);
    }).catch((error: unknown) => {
      console.error("Cloudinary upload failed", error);
      throw new InternalServerError("Failed to persist uploaded file.");
    });

    return result.secure_url;
  }

  async delete(filePath: string): Promise<void> {
    // The caller passes Media.fileName. Reject anything containing a path
    // segment so the folder prefix cannot be escaped.
    const safeFileName = path.basename(filePath);
    if (safeFileName !== filePath) {
      throw new BadRequestError("Invalid file path.");
    }

    assertStoredFileName(safeFileName);

    try {
      const result = await cloudinary.uploader.destroy(
        publicIdFor(safeFileName, this.folder),
        { resource_type: resourceTypeFor(safeFileName), invalidate: true },
      );

      // "not found" is treated as success, matching the local provider's ENOENT
      // handling: the desired end state (asset absent) already holds.
      if (result.result !== "ok" && result.result !== "not found") {
        throw new Error(`Cloudinary destroy returned "${result.result}"`);
      }
    } catch (error: unknown) {
      console.error("Cloudinary delete failed", error);
      throw new InternalServerError("Failed to delete stored media file.");
    }
  }
}

export default CloudinaryStorageProvider;
