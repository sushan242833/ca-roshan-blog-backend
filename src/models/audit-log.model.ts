import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { Optional } from "sequelize";

export interface AuditLogAttributes {
  id: string;
  action: string;
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  outcome: string;
  createdAt?: Date;
}

export type AuditLogCreationAttributes = Optional<
  AuditLogAttributes,
  "id" | "actorId" | "targetType" | "targetId" | "ip" | "userAgent" | "createdAt"
>;

// Append-only: rows are written and read, never updated, so there is no
// updated_at column to maintain.
@Table({
  tableName: "audit_logs",
  timestamps: true,
  updatedAt: false,
  underscored: true,
})
export class AuditLog extends Model<
  AuditLogAttributes,
  AuditLogCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  id!: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(64) })
  action!: string;

  // No foreign key to admins: a failed login has no known actor, and the trail
  // must survive the account it references.
  @AllowNull(true)
  @Column({ type: DataType.UUID, field: "actor_id" })
  actorId?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(64), field: "target_type" })
  targetType?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(64), field: "target_id" })
  targetId?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(64) })
  ip?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(255), field: "user_agent" })
  userAgent?: string | null;

  @AllowNull(false)
  @Column({ type: DataType.STRING(16) })
  outcome!: string;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt!: Date;
}

export default AuditLog;
