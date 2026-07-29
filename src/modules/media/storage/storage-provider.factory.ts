import { env } from "@config/env";
import { MediaProvider } from "../media.model";
import { StorageProvider } from "./storage-provider.interface";
import { LocalStorageProvider } from "./local-storage.provider";
import { CloudinaryStorageProvider } from "./cloudinary-storage.provider";

export interface ResolvedStorage {
  provider: StorageProvider;
  // Persisted on each Media row so a later migration between drivers can tell
  // which backend actually holds a given asset.
  mediaProvider: MediaProvider;
}

// Single place where the driver is chosen. env.ts has already verified that the
// Cloudinary credentials exist when the driver is "cloudinary", so this cannot
// silently fall back to local disk in production.
export function resolveStorage(): ResolvedStorage {
  if (env.MEDIA_STORAGE_DRIVER === "cloudinary") {
    return {
      provider: new CloudinaryStorageProvider(),
      mediaProvider: MediaProvider.CLOUDINARY,
    };
  }

  return {
    provider: new LocalStorageProvider(),
    mediaProvider: MediaProvider.LOCAL,
  };
}

export default resolveStorage;
