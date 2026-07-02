import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  CreatedAt,
  UpdatedAt,
  HasMany,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import Post from "./post.model";

export interface AdminAttributes {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  isActive: boolean;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  yearsOfExperience?: string | null;
  qualification?: string | null;
  bioParagraph2?: string | null;
  professionalQuote?: string | null;
  expertise?: string | null; // stored as JSON string
  closingMessage?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  refreshTokenHash?: string | null;
  singletonKey?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AdminCreationAttributes = Optional<
  AdminAttributes,
  | "id"
  | "isActive"
  | "title"
  | "bio"
  | "avatarUrl"
  | "location"
  | "yearsOfExperience"
  | "qualification"
  | "bioParagraph2"
  | "professionalQuote"
  | "expertise"
  | "closingMessage"
  | "seoTitle"
  | "seoDescription"
  | "ogImageUrl"
  | "singletonKey"
  | "createdAt"
  | "updatedAt"
>;

@Table({ tableName: "admins", timestamps: true, underscored: true })
export class Admin extends Model<AdminAttributes, AdminCreationAttributes> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @Unique
  @AllowNull(false)
  @Column({ type: DataType.STRING })
  email!: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(255) })
  name!: string;

  @AllowNull(false)
  @Default(true)
  @Column({ field: "is_active", type: DataType.BOOLEAN })
  isActive!: boolean;

  @AllowNull(true)
  @Column({ type: DataType.STRING(150) })
  title?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  bio?: string | null;

  @AllowNull(true)
  @Column({ field: "avatar_url", type: DataType.STRING(500) })
  avatarUrl?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(200) })
  location?: string | null;

  @AllowNull(true)
  @Column({ field: "years_of_experience", type: DataType.STRING(100) })
  yearsOfExperience?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(300) })
  qualification?: string | null;

  @AllowNull(true)
  @Column({ field: "bio_paragraph2", type: DataType.TEXT })
  bioParagraph2?: string | null;

  @AllowNull(true)
  @Column({ field: "professional_quote", type: DataType.TEXT })
  professionalQuote?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  expertise?: string | null;

  @AllowNull(true)
  @Column({ field: "closing_message", type: DataType.TEXT })
  closingMessage?: string | null;

  @AllowNull(true)
  @Column({ field: "seo_title", type: DataType.STRING(60) })
  seoTitle?: string | null;

  @AllowNull(true)
  @Column({ field: "seo_description", type: DataType.STRING(160) })
  seoDescription?: string | null;

  @AllowNull(true)
  @Column({ field: "og_image_url", type: DataType.STRING(500) })
  ogImageUrl?: string | null;

  // Database-level guard: a UNIQUE index on this constant-valued column
  // makes it structurally impossible to insert a second admin row. Never
  // exposed in API responses.
  @AllowNull(false)
  @Default(1)
  @Column({ field: "singleton_key", type: DataType.INTEGER })
  singletonKey!: number;

  @AllowNull(false)
  @Column({ field: "password_hash", type: DataType.STRING })
  passwordHash!: string;

  @AllowNull(true)
  @Column({ field: "refresh_token_hash", type: DataType.STRING })
  refreshTokenHash?: string | null;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;

  @HasMany(() => Post)
  posts?: Post[];
}

export default Admin;
