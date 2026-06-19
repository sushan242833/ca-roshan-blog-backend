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
  DeletedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
  BelongsToMany,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import Admin from "./admin.model";
import Category from "./category.model";
import Tag from "./tag.model";
import PostCategory from "./post-category.model";
import PostTag from "./post-tag.model";
import NewsletterLog from "./newsletter-log.model";

export interface PostAttributes {
  id: string;
  title: string;
  content: string;
  slug: string;
  adminId: string;
  publishedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type PostCreationAttributes = Optional<
  PostAttributes,
  "id" | "publishedAt" | "createdAt" | "updatedAt" | "deletedAt"
>;

@Table({
  tableName: "posts",
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class Post extends Model<PostAttributes, PostCreationAttributes> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING })
  title!: string;

  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  content!: string;

  @Unique
  @AllowNull(false)
  @Column({ type: DataType.STRING })
  slug!: string;

  @ForeignKey(() => Admin)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "admin_id" })
  adminId!: string;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "published_at" })
  publishedAt?: Date | null;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;

  @DeletedAt
  @Column({ field: "deleted_at", type: DataType.DATE })
  deletedAt?: Date | null;

  @BelongsTo(() => Admin)
  author?: Admin;

  @BelongsToMany(() => Category, () => PostCategory)
  categories?: Category[];

  @BelongsToMany(() => Tag, () => PostTag)
  tags?: Tag[];

  @HasMany(() => NewsletterLog)
  newsletterLogs?: NewsletterLog[];
}

export default Post;
