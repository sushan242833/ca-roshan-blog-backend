import { QueryInterface } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureColumn(
      queryInterface,
      "admins",
      "title",
      { type: "VARCHAR(150)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "bio",
      { type: "TEXT", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "avatar_url",
      { type: "VARCHAR(500)", allowNull: true },
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeColumn("admins", "title", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "bio", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "avatar_url", { transaction })
      .catch(() => {});
  });
}
