import { QueryInterface } from "sequelize";
import { ensureColumn, ensureIndex } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Add the sentinel column with a constant default of 1.
    // A UNIQUE index on this column means a second row can never be
    // inserted — the database rejects it regardless of what the
    // application layer does.
    await ensureColumn(
      queryInterface,
      "admins",
      "singleton_key",
      { type: "INTEGER", allowNull: false, defaultValue: 1 },
      { transaction },
    );

    await ensureIndex(queryInterface, "admins", ["singleton_key"], {
      name: "admins_singleton_key_unique",
      unique: true,
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    try {
      await queryInterface.removeIndex(
        "admins",
        "admins_singleton_key_unique",
        { transaction },
      );
    } catch {
      // already removed — safe to continue
    }

    await queryInterface
      .removeColumn("admins", "singleton_key", { transaction })
      .catch(() => {});
  });
}
