import fs from "fs/promises";
import path from "path";
import { env } from "@config/env";
import { assertStoredFileName } from "../media.dto";
import { BadRequestError, InternalServerError } from "../media.errors";
import { StorageProvider, StorageUploadFile } from "./storage-provider.interface";

interface ErrorWithCode {
  code?: string;
}

function hasErrorCode(value: unknown): value is ErrorWithCode {
  return typeof value === "object" && value !== null && "code" in value;
}

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadRoot: string;
  private readonly normalizedBaseUrl: string;

  constructor(
    uploadRoot = path.resolve(process.cwd(), "uploads"),
    mediaBaseUrl = env.MEDIA_BASE_URL,
  ) {
    this.uploadRoot = path.resolve(uploadRoot);
    this.normalizedBaseUrl = mediaBaseUrl.replace(/\/+$/g, "");
  }

  private resolveSafePath(fileName: string): string {
    assertStoredFileName(fileName);

    const absolutePath = path.resolve(this.uploadRoot, fileName);
    const absoluteRootWithSeparator = `${this.uploadRoot}${path.sep}`;
    if (!absolutePath.startsWith(absoluteRootWithSeparator)) {
      throw new BadRequestError("Invalid file path.");
    }

    return absolutePath;
  }

  async upload(file: StorageUploadFile): Promise<string> {
    await fs.mkdir(this.uploadRoot, { recursive: true });

    const safePath = this.resolveSafePath(file.fileName);

    try {
      await fs.writeFile(safePath, file.buffer, { flag: "wx" });
    } catch (error: unknown) {
      if (hasErrorCode(error) && error.code === "EEXIST") {
        throw new InternalServerError("Generated file name already exists.");
      }
      throw new InternalServerError("Failed to persist uploaded file.");
    }

    return `${this.normalizedBaseUrl}/uploads/${encodeURIComponent(
      file.fileName,
    )}`;
  }

  async delete(filePath: string): Promise<void> {
    const safeFileName = path.basename(filePath);
    if (safeFileName !== filePath) {
      throw new BadRequestError("Invalid file path.");
    }

    const safePath = this.resolveSafePath(safeFileName);

    try {
      await fs.unlink(safePath);
    } catch (error: unknown) {
      if (hasErrorCode(error) && error.code === "ENOENT") {
        return;
      }
      throw new InternalServerError("Failed to delete stored media file.");
    }
  }
}

export default LocalStorageProvider;
