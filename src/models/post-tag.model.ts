import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import Post from "./post.model";
import Tag from "./tag.model";

export interface PostTagAttributes {
  id: string;
  postId: string;
  tagId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PostTagCreationAttributes = Optional<
  PostTagAttributes,
  "id" | "createdAt" | "updatedAt"
>;

@Table({ tableName: "post_tags", timestamps: true, underscored: true })
export class PostTag extends Model<
  PostTagAttributes,
  PostTagCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @ForeignKey(() => Post)
  @Column({ type: DataType.UUID, field: "post_id" })
  postId!: string;

  @ForeignKey(() => Tag)
  @Column({ type: DataType.UUID, field: "tag_id" })
  tagId!: string;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;
}

export default PostTag;
