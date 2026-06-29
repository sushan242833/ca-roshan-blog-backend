import { QueryInterface } from "sequelize";
import {
  ensureColumn,
  ensureConstraint,
  ensureIndex,
} from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureColumn(
      queryInterface,
      "posts",
      "category_id",
      { type: "UUID", allowNull: true },
      { transaction },
    );

    await ensureConstraint(queryInterface, "posts", {
      fields: ["category_id"],
      type: "foreign key",
      name: "fk_posts_category",
      references: { table: "categories", field: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      transaction,
    });

    await ensureIndex(queryInterface, "posts", ["category_id"], {
      name: "posts_category_id",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeConstraint("posts", "fk_posts_category", { transaction })
      .catch(() => {});
    await queryInterface
      .removeIndex("posts", "posts_category_id", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("posts", "category_id", { transaction })
      .catch(() => {});
  });
}
