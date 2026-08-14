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
  // title/bio/avatarUrl are the author-byline fields embedded in post
  // responses — not About-page content, which is now static in the frontend.
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  refreshTokenHash?: string | null;
  sessionsInvalidatedAt?: Date | null;
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
  | "sessionsInvalidatedAt"
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

  @AllowNull(true)
  @Column({ field: "sessions_invalidated_at", type: DataType.DATE })
  sessionsInvalidatedAt?: Date | null;

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
