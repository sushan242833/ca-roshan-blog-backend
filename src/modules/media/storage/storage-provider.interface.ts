import { AllowedImageMimeType } from "../media.dto";

export interface StorageUploadFile {
  fileName: string;
  buffer: Buffer;
  mimeType: AllowedImageMimeType;
  size: number;
}

export interface StorageProvider {
  upload(file: StorageUploadFile): Promise<string>;
  delete(filePath: string): Promise<void>;
}
