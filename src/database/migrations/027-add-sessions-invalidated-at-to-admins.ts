import { QueryInterface } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureColumn(
      queryInterface,
      "admins",
      "sessions_invalidated_at",
      { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeColumn("admins", "sessions_invalidated_at", { transaction })
      .catch(() => {});
  });
}
