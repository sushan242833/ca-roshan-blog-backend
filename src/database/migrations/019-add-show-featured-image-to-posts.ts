import { QueryInterface } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Controls whether the featured image is rendered at the top of the blog
    // detail page (below the title). Defaults to true so every existing post
    // keeps showing its hero image; the admin can opt out per post.
    await ensureColumn(
      queryInterface,
      "posts",
      "show_featured_image",
      { type: "BOOLEAN", allowNull: false, defaultValue: true },
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeColumn("posts", "show_featured_image", { transaction })
      .catch(() => {});
  });
}
