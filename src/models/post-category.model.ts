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
import Category from "./category.model";

export interface PostCategoryAttributes {
  postId: string;
  categoryId: string;
  createdAt?: Date;
}

export type PostCategoryCreationAttributes = Omit<
  PostCategoryAttributes,
  "createdAt"
>;

@Table({ tableName: "post_categories", timestamps: false, underscored: true })
export class PostCategory extends Model<
  PostCategoryAttributes,
  PostCategoryCreationAttributes
> {
  @PrimaryKey
  @ForeignKey(() => Post)
  @Column({ type: DataType.UUID, field: "post_id" })
  postId!: string;

  @PrimaryKey
  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID, field: "category_id" })
  categoryId!: string;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;
}

export default PostCategory;
