import { QueryInterface } from "sequelize";
import {
  ensureConstraint,
  ensureIndex,
  ensureTable,
} from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureTable(
      queryInterface,
      "post_categories",
      {
        post_id: { type: "UUID", allowNull: false, primaryKey: true },
        category_id: { type: "UUID", allowNull: false, primaryKey: true },
        created_at: {
          type: "TIMESTAMP WITH TIME ZONE",
          allowNull: false,
          defaultValue: queryInterface.sequelize.literal("now()"),
        },
      },
      { transaction },
    );

    await ensureIndex(queryInterface, "post_categories", ["post_id"], {
      name: "post_categories_post_id",
      transaction,
    });
    await ensureIndex(queryInterface, "post_categories", ["category_id"], {
      name: "post_categories_category_id",
      transaction,
    });

    await ensureConstraint(queryInterface, "post_categories", {
      fields: ["post_id"],
      type: "foreign key",
      name: "fk_post_categories_post",
      references: { table: "posts", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      transaction,
    });

    await ensureConstraint(queryInterface, "post_categories", {
      fields: ["category_id"],
      type: "foreign key",
      name: "fk_post_categories_category",
      references: { table: "categories", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeConstraint("post_categories", "fk_post_categories_post", {
        transaction,
      })
      .catch(() => {});
    await queryInterface
      .removeConstraint("post_categories", "fk_post_categories_category", {
        transaction,
      })
      .catch(() => {});
    await queryInterface.dropTable("post_categories", { transaction });
  });
}
