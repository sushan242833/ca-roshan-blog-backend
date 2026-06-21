import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { Optional } from "sequelize";

export enum MediaProvider {
  LOCAL = "LOCAL",
  S3 = "S3",
  CLOUDINARY = "CLOUDINARY",
}

export interface MediaAttributes {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  provider: MediaProvider;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type MediaCreationAttributes = Optional<
  MediaAttributes,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

@Table({
  tableName: "media",
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class Media extends Model<MediaAttributes, MediaCreationAttributes> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(255), field: "file_name" })
  fileName!: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(255), field: "original_name" })
  originalName!: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(128), field: "mime_type" })
  mimeType!: string;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER })
  size!: number;

  @AllowNull(false)
  @Column({ type: DataType.STRING(2048) })
  url!: string;

  @AllowNull(false)
  @Default(MediaProvider.LOCAL)
  @Column({
    type: DataType.ENUM(
      MediaProvider.LOCAL,
      MediaProvider.S3,
      MediaProvider.CLOUDINARY,
    ),
  })
  provider!: MediaProvider;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;

  @DeletedAt
  @Column({ field: "deleted_at", type: DataType.DATE })
  deletedAt?: Date | null;
}

export default Media;
