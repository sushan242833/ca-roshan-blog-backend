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
import Subscriber from "./subscriber.model";
import Post from "@models/post.model";

export interface NewsletterLogAttributes {
  id: string;
  subscriberId: string;
  postId: string;
  status?: string | null;
  sentAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NewsletterLogCreationAttributes = Optional<
  NewsletterLogAttributes,
  "id" | "status" | "sentAt" | "createdAt" | "updatedAt"
>;

@Table({ tableName: "newsletter_logs", timestamps: true, underscored: true })
export class NewsletterLog extends Model<
  NewsletterLogAttributes,
  NewsletterLogCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @ForeignKey(() => Subscriber)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "subscriber_id" })
  subscriberId!: string;

  @ForeignKey(() => Post)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "post_id" })
  postId!: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING })
  status?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "sent_at" })
  sentAt?: Date | null;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;

  @BelongsTo(() => Subscriber)
  subscriber?: Subscriber;

  @BelongsTo(() => Post)
  post?: Post;
}

export default NewsletterLog;
