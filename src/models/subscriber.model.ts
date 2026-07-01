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
  HasMany,
} from "sequelize-typescript";
import { Optional } from "sequelize";
import NewsletterLog from "@models/newsletter-log.model";

export enum SubscriberStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  UNSUBSCRIBED = "UNSUBSCRIBED",
}

export interface SubscriberAttributes {
  id: string;
  email: string;
  status: SubscriberStatus;
  verificationToken?: string | null;
  verificationTokenExpiresAt?: Date | null;
  unsubscribeToken: string;
  verifiedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type SubscriberCreationAttributes = Optional<
  SubscriberAttributes,
  | "id"
  | "status"
  | "verificationToken"
  | "verificationTokenExpiresAt"
  | "verifiedAt"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>;

@Table({
  tableName: "subscribers",
  timestamps: true,
  underscored: true,
  paranoid: true,
})
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

  @AllowNull(false)
  @Default(SubscriberStatus.PENDING)
  @Column({
    type: DataType.ENUM(
      SubscriberStatus.PENDING,
      SubscriberStatus.ACTIVE,
      SubscriberStatus.UNSUBSCRIBED,
    ),
  })
  status!: SubscriberStatus;

  @AllowNull(true)
  @Unique
  @Column({ type: DataType.STRING(255), field: "verification_token" })
  verificationToken?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "verification_token_expires_at" })
  verificationTokenExpiresAt?: Date | null;

  @AllowNull(false)
  @Unique
  @Column({ type: DataType.STRING(255), field: "unsubscribe_token" })
  unsubscribeToken!: string;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: "verified_at" })
  verifiedAt?: Date | null;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt!: Date;

  @DeletedAt
  @Column({ field: "deleted_at", type: DataType.DATE })
  deletedAt?: Date | null;

  @HasMany(() => NewsletterLog)
  newsletterLogs?: NewsletterLog[];
}

export default Subscriber;
