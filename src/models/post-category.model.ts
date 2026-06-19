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
import Category from "./category.model";

export interface PostCategoryAttributes {
  id: string;
  postId: string;
  categoryId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PostCategoryCreationAttributes = Optional<
  PostCategoryAttributes,
  "id" | "createdAt" | "updatedAt"
>;

@Table({ tableName: "post_categories", timestamps: true, underscored: true })
export class PostCategory extends Model<
  PostCategoryAttributes,
  PostCategoryCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @ForeignKey(() => Post)
  @Column({ type: DataType.UUID, field: "post_id" })
  postId!: string;

  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID, field: "category_id" })
  categoryId!: string;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;
}

export default PostCategory;
