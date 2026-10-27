import { QueryInterface } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Marks the one post headlined in the home page's video hero. The service
    // clears it on every other post whenever one is set, so at most one row is
    // ever true. Defaults to false: with none chosen, the site falls back to
    // the newest featured post.
    await ensureColumn(
      queryInterface,
      "posts",
      "show_in_hero",
      { type: "BOOLEAN", allowNull: false, defaultValue: false },
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeColumn("posts", "show_in_hero", { transaction })
      .catch(() => {});
  });
}
