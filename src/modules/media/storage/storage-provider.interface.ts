import { AllowedMimeType } from "../media.dto";

export interface StorageUploadFile {
  fileName: string;
  buffer: Buffer;
  mimeType: AllowedMimeType;
  size: number;
}

export interface StorageProvider {
  upload(file: StorageUploadFile): Promise<string>;
  delete(filePath: string): Promise<void>;
}
