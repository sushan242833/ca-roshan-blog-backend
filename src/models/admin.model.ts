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
  refreshTokenHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AdminCreationAttributes = Optional<
  AdminAttributes,
  "id" | "isActive" | "createdAt" | "updatedAt"
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
