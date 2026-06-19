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
import PostCategory from "./post-category.model";

export interface CategoryAttributes {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CategoryCreationAttributes = Optional<
  CategoryAttributes,
  "id" | "createdAt" | "updatedAt"
>;

@Table({ tableName: "categories", timestamps: true, underscored: true })
export class Category extends Model<
  CategoryAttributes,
  CategoryCreationAttributes
> {
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

  @BelongsToMany(() => Post, () => PostCategory)
  posts?: Post[];
}

export default Category;
