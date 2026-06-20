import { QueryInterface } from "sequelize";
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
        verified: { type: "BOOLEAN", allowNull: false, defaultValue: false },
        verification_token: { type: "VARCHAR(255)", allowNull: true },
        subscribed_at: { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
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

    await ensureIndex(queryInterface, "subscribers", ["email"], {
      name: "subscribers_email_key",
      unique: true,
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable("subscribers", { transaction });
  });
}
