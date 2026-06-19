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
  BelongsToMany,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import Post from "./post.model";
import PostTag from "./post-tag.model";

export interface TagAttributes {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TagCreationAttributes = Optional<
  TagAttributes,
  "id" | "createdAt" | "updatedAt"
>;

@Table({ tableName: "tags", timestamps: true, underscored: true })
export class Tag extends Model<TagAttributes, TagCreationAttributes> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING })
  name!: string;

  @Unique
  @AllowNull(false)
  @Column({ type: DataType.STRING })
  slug!: string;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;

  @BelongsToMany(() => Post, () => PostTag)
  posts?: Post[];
}

export default Tag;
