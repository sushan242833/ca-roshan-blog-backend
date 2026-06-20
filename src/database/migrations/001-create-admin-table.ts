import { QueryInterface } from "sequelize";
import { ensureIndex, ensureTable } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // ensure pgcrypto for gen_random_uuid()
    await queryInterface.sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
      { transaction },
    );

    await ensureTable(
      queryInterface,
      "admins",
      {
        id: {
          type: "UUID",
          allowNull: false,
          primaryKey: true,
          defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
        },
        name: { type: "VARCHAR(255)", allowNull: false },
        email: { type: "VARCHAR(255)", allowNull: false },
        password_hash: { type: "TEXT", allowNull: false },
        refresh_token_hash: { type: "TEXT", allowNull: true },
        is_active: { type: "BOOLEAN", allowNull: false, defaultValue: true },
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

    await ensureIndex(queryInterface, "admins", ["email"], {
      name: "admins_email_key",
      unique: true,
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable("admins", { transaction });
  });
}
