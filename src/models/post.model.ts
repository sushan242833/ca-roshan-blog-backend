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
import PostChapter from "./post-chapter.model";
import { Media } from "@modules/media/media.model";

export enum PostStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export interface PostAttributes {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  // Plain-text projection of `content`, used only for searching — never
  // returned to clients (see post-response.dto.ts).
  searchText?: string | null;
  // Generated, weighted tsvector (migration 022). Read-only: populated by the
  // database, never written by the app, and never returned to clients. Named to
  // match the column exactly so its SELECT alias equals "search_vector" — that
  // keeps the same identifier valid in both the WHERE (inner subquery, real
  // column) and the ORDER BY (outer paginated query, aliased column).
  search_vector?: string | null;
  featuredImageId?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  pdfUrl?: string | null;
  pdfLabel?: string | null;
  showFeaturedImage: boolean;
  // Whether this post is served as a chapter list rather than one page. Derived
  // from `content` and kept in step with the post_chapters rows by
  // regeneratePostChapters — never set by a client.
  paginated: boolean;
  // Number of chapters the reader can page through; 1 for a non-paginated post.
  // Denormalised so the index page never has to count post_chapters.
  chapterCount: number;
  status: PostStatus;
  featured: boolean;
  readingTime: number;
  viewCount: number;
  adminId: string;
  categoryId?: string | null;
  publishedAt?: Date | null;
  // Set once, the first time this post's newsletter is dispatched, so it is
  // never sent twice across publish/unpublish/republish cycles.
  newsletterSentAt?: Date | null;
  // SHA-256 digest of the opaque preview token handed to the author, and the
  // instant that token stops working. Only ever read in a WHERE clause — see
  // the excluded-attribute lists in post.repository.ts, which keep the digest
  // out of every response.
  previewTokenHash?: string | null;
  previewTokenExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type PostCreationAttributes = Optional<
  PostAttributes,
  | "id"
  | "excerpt"
  | "searchText"
  | "search_vector"
  | "featuredImageId"
  | "metaTitle"
  | "metaDescription"
  | "pdfUrl"
  | "pdfLabel"
  | "showFeaturedImage"
  | "paginated"
  | "chapterCount"
  | "status"
  | "featured"
  | "readingTime"
  | "viewCount"
  | "categoryId"
  | "publishedAt"
  | "newsletterSentAt"
  | "previewTokenHash"
  | "previewTokenExpiresAt"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
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
  @Column({ type: DataType.STRING(255) })
  title!: string;

  @Unique
  @AllowNull(false)
  @Column({ type: DataType.STRING(255) })
  slug!: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  excerpt?: string | null;

  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  content!: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT, field: "search_text" })
  searchText?: string | null;

  // GENERATED ALWAYS column — Sequelize only reads it. Never include it in a
  // create/update payload (Postgres rejects writes to a generated column).
  @AllowNull(true)
  @Column({ type: DataType.TSVECTOR, field: "search_vector" })
  search_vector?: string | null;

  @ForeignKey(() => Media)
  @AllowNull(true)
  @Column({ type: DataType.UUID, field: "featured_image_id" })
  featuredImageId?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(60), field: "meta_title" })
  metaTitle?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(160), field: "meta_description" })
  metaDescription?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(2048), field: "pdf_url" })
  pdfUrl?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(255), field: "pdf_label" })
  pdfLabel?: string | null;

  @AllowNull(false)
  @Default(true)
  @Column({ type: DataType.BOOLEAN, field: "show_featured_image" })
  showFeaturedImage!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN })
  paginated!: boolean;

  @AllowNull(false)
  @Default(1)
  @Column({ type: DataType.INTEGER, field: "chapter_count" })
  chapterCount!: number;

  @AllowNull(false)
  @Default(PostStatus.DRAFT)
  @Column({
    type: DataType.ENUM(
      PostStatus.DRAFT,
      PostStatus.PUBLISHED,
      PostStatus.ARCHIVED,
    ),
  })
  status!: PostStatus;

  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN })
  featured!: boolean;

  @AllowNull(false)
  @Default(1)
  @Column({ type: DataType.INTEGER, field: "reading_time" })
  readingTime!: number;

  @AllowNull(false)
  @Default(0)
  @Column({ type: DataType.INTEGER, field: "view_count" })
  viewCount!: number;

  @ForeignKey(() => Admin)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "admin_id" })
  adminId!: string;

  @ForeignKey(() => Category)
  @AllowNull(true)
  @Column({ type: DataType.UUID, field: "category_id" })
  categoryId?: string | null;

  @BelongsTo(() => Category)
  category?: Category | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "published_at" })
  publishedAt?: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "newsletter_sent_at" })
  newsletterSentAt?: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(64), field: "preview_token_hash" })
  previewTokenHash?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "preview_token_expires_at" })
  previewTokenExpiresAt?: Date | null;

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

  @BelongsTo(() => Media)
  featuredImage?: Media | null;

  @BelongsToMany(() => Category, () => PostCategory)
  categories?: Category[];

  @BelongsToMany(() => Tag, () => PostTag)
  tags?: Tag[];

  @HasMany(() => NewsletterLog)
  newsletterLogs?: NewsletterLog[];

  // Persisted chapter split, present only for paginated posts. Deliberately
  // never eager-loaded with the post: the point of the table is that a read
  // touches one chapter row, not the whole set (and never the `html` column
  // unless that one chapter is being served).
  @HasMany(() => PostChapter)
  chapters?: PostChapter[];
}

export default Post;
