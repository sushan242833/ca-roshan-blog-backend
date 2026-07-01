import { QueryInterface } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureColumn(
      queryInterface,
      "subscribers",
      "verification_token_expires_at",
      { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeColumn("subscribers", "verification_token_expires_at", {
        transaction,
      })
      .catch(() => {});
  });
}
