import { DataTypes, QueryInterface } from "sequelize";
import {
  ensureConstraint,
  ensureIndex,
  ensureTable,
} from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureTable(
      queryInterface,
      "newsletter_logs",
      {
        id: {
          type: "UUID",
          allowNull: false,
          primaryKey: true,
          defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
        },
        subscriber_id: { type: "UUID", allowNull: false },
        post_id: { type: "UUID", allowNull: false },
        status: {
          type: DataTypes.ENUM("PENDING", "SENT", "FAILED"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        sent_at: { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
        error_message: { type: "TEXT", allowNull: true },
        created_at: {
          type: "TIMESTAMP WITH TIME ZONE",
          allowNull: false,
          defaultValue: queryInterface.sequelize.literal("now()"),
        },
        updated_at: {
          type: "TIMESTAMP WITH TIME ZONE",
          allowNull: false,
          defaultValue: queryInterface.sequelize.literal("now()"),
        },
      },
      { transaction },
    );

    await ensureIndex(queryInterface, "newsletter_logs", ["status"], {
      name: "newsletter_logs_status",
      transaction,
    });
    await ensureIndex(queryInterface, "newsletter_logs", ["post_id", "subscriber_id"], {
      name: "newsletter_logs_post_subscriber",
      transaction,
    });

    await ensureConstraint(queryInterface, "newsletter_logs", {
      fields: ["subscriber_id"],
      type: "foreign key",
      name: "fk_newsletter_subscriber",
      references: { table: "subscribers", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      transaction,
    });

    await ensureIndex(queryInterface, "newsletter_logs", ["subscriber_id"], {
      name: "newsletter_logs_subscriber_id",
      transaction,
    });
    await ensureIndex(queryInterface, "newsletter_logs", ["post_id"], {
      name: "newsletter_logs_post_id",
      transaction,
    });

    await ensureConstraint(queryInterface, "newsletter_logs", {
      fields: ["post_id"],
      type: "foreign key",
      name: "fk_newsletter_post",
      references: { table: "posts", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeConstraint("newsletter_logs", "fk_newsletter_subscriber", {
        transaction,
      })
      .catch(() => {});
    await queryInterface
      .removeConstraint("newsletter_logs", "fk_newsletter_post", {
        transaction,
      })
      .catch(() => {});
    await queryInterface.dropTable("newsletter_logs", { transaction });
    await queryInterface.sequelize
      .query('DROP TYPE IF EXISTS "enum_newsletter_logs_status";', { transaction })
      .catch(() => {});
  });
}
