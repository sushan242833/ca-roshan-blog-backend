import { QueryInterface } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Optional short description shown on the categories listing page.
    // Nullable so existing categories remain valid without a backfill.
    await ensureColumn(
      queryInterface,
      "categories",
      "description",
      { type: "TEXT", allowNull: true },
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeColumn("categories", "description", { transaction })
      .catch(() => {});
  });
}
