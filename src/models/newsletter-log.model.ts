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

export enum NewsletterLogStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
}

export interface NewsletterLogAttributes {
  id: string;
  postId: string;
  subscriberId: string;
  status: NewsletterLogStatus;
  sentAt?: Date | null;
  errorMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NewsletterLogCreationAttributes = Optional<
  NewsletterLogAttributes,
  "id" | "status" | "sentAt" | "errorMessage" | "createdAt" | "updatedAt"
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

  @ForeignKey(() => Post)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "post_id" })
  postId!: string;

  @ForeignKey(() => Subscriber)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "subscriber_id" })
  subscriberId!: string;

  @AllowNull(false)
  @Default(NewsletterLogStatus.PENDING)
  @Column({
    type: DataType.ENUM(
      NewsletterLogStatus.PENDING,
      NewsletterLogStatus.SENT,
      NewsletterLogStatus.FAILED,
    ),
  })
  status!: NewsletterLogStatus;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "sent_at" })
  sentAt?: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.TEXT, field: "error_message" })
  errorMessage?: string | null;

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
