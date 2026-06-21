import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  PrimaryKey,
  CreatedAt,
} from "sequelize-typescript";
import Post from "./post.model";
import Tag from "./tag.model";

export interface PostTagAttributes {
  postId: string;
  tagId: string;
  createdAt?: Date;
}

export type PostTagCreationAttributes = Omit<PostTagAttributes, "createdAt">;

@Table({ tableName: "post_tags", timestamps: false, underscored: true })
export class PostTag extends Model<PostTagAttributes, PostTagCreationAttributes> {
  @PrimaryKey
  @ForeignKey(() => Post)
  @Column({ type: DataType.UUID, field: "post_id" })
  postId!: string;

  @PrimaryKey
  @ForeignKey(() => Tag)
  @Column({ type: DataType.UUID, field: "tag_id" })
  tagId!: string;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;
}

export default PostTag;
