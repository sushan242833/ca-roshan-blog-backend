import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import Post from "@models/post.model";

// One persisted chapter of a paginated post: the slice of `posts.content` that
// splitIntoChapters produced, stored so a chapter page can be served without
// reading the post body. Rows exist only for posts with `paginated = true`;
// short posts render from `content` inline and have no rows here.
export interface PostChapterAttributes {
  id: string;
  postId: string;
  /** Stable slug-derived id from splitIntoChapters — this is the URL segment. */
  chapterId: string;
  order: number;
  title: string;
  excerpt?: string | null;
  html: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PostChapterCreationAttributes = Optional<
  PostChapterAttributes,
  "id" | "excerpt" | "createdAt" | "updatedAt"
>;

@Table({ tableName: "post_chapters", timestamps: true, underscored: true })
export class PostChapter extends Model<
  PostChapterAttributes,
  PostChapterCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @ForeignKey(() => Post)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "post_id" })
  postId!: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(255), field: "chapter_id" })
  chapterId!: string;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER })
  order!: number;

  @AllowNull(false)
  @Column({ type: DataType.STRING(512) })
  title!: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  excerpt?: string | null;

  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  html!: string;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;

  @BelongsTo(() => Post)
  post?: Post;
}

export default PostChapter;
