import { DataTypes, QueryInterface } from "sequelize";
import { ensureIndex, ensureTable } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureTable(
      queryInterface,
      "subscribers",
      {
        id: {
          type: "UUID",
          allowNull: false,
          primaryKey: true,
          defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
        },
        email: { type: "VARCHAR(255)", allowNull: false },
        status: {
          type: DataTypes.ENUM("PENDING", "ACTIVE", "UNSUBSCRIBED"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        verification_token: { type: "VARCHAR(255)", allowNull: true },
        unsubscribe_token: { type: "VARCHAR(255)", allowNull: false },
        verified_at: { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
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
        deleted_at: { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
      },
      { transaction },
    );

    await ensureIndex(queryInterface, "subscribers", ["email"], {
      name: "subscribers_email_key",
      unique: true,
      transaction,
    });
    await ensureIndex(queryInterface, "subscribers", ["status"], {
      name: "subscribers_status",
      transaction,
    });
    await ensureIndex(queryInterface, "subscribers", ["verification_token"], {
      name: "subscribers_verification_token_key",
      unique: true,
      transaction,
    });
    await ensureIndex(queryInterface, "subscribers", ["unsubscribe_token"], {
      name: "subscribers_unsubscribe_token_key",
      unique: true,
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable("subscribers", { transaction });
    await queryInterface.sequelize
      .query('DROP TYPE IF EXISTS "enum_subscribers_status";', { transaction })
      .catch(() => {});
  });
}
