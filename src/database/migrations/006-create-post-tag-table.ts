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
      "post_tags",
      {
        post_id: { type: "UUID", allowNull: false, primaryKey: true },
        tag_id: { type: "UUID", allowNull: false, primaryKey: true },
        created_at: {
          type: "TIMESTAMP WITH TIME ZONE",
          allowNull: false,
          defaultValue: queryInterface.sequelize.literal("now()"),
        },
      },
      { transaction },
    );

    await ensureIndex(queryInterface, "post_tags", ["post_id"], {
      name: "post_tags_post_id",
      transaction,
    });
    await ensureIndex(queryInterface, "post_tags", ["tag_id"], {
      name: "post_tags_tag_id",
      transaction,
    });

    await ensureConstraint(queryInterface, "post_tags", {
      fields: ["post_id"],
      type: "foreign key",
      name: "fk_post_tags_post",
      references: { table: "posts", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      transaction,
    });

    await ensureConstraint(queryInterface, "post_tags", {
      fields: ["tag_id"],
      type: "foreign key",
      name: "fk_post_tags_tag",
      references: { table: "tags", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeConstraint("post_tags", "fk_post_tags_post", { transaction })
      .catch(() => {});
    await queryInterface
      .removeConstraint("post_tags", "fk_post_tags_tag", { transaction })
      .catch(() => {});
    await queryInterface.dropTable("post_tags", { transaction });
  });
}
