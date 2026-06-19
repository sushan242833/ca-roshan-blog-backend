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
  HasMany,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import NewsletterLog from "@models/newsletter-log.model";

export interface SubscriberAttributes {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SubscriberCreationAttributes = Optional<
  SubscriberAttributes,
  "id" | "createdAt" | "updatedAt"
>;

@Table({ tableName: "subscribers", timestamps: true, underscored: true })
export class Subscriber extends Model<
  SubscriberAttributes,
  SubscriberCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @Unique
  @AllowNull(false)
  @Column({ type: DataType.STRING })
  email!: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING })
  name?: string | null;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;

  @HasMany(() => NewsletterLog)
  newsletterLogs?: NewsletterLog[];
}

export default Subscriber;
