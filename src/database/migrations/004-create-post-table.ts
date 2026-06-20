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
      "posts",
      {
        id: {
          type: "UUID",
          allowNull: false,
          primaryKey: true,
          defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
        },
        title: { type: "VARCHAR(255)", allowNull: false },
        slug: { type: "VARCHAR(255)", allowNull: false },
        excerpt: { type: "TEXT", allowNull: true },
        content: { type: "TEXT", allowNull: false },
        featured_image: { type: "VARCHAR(1024)", allowNull: true },
        meta_title: { type: "VARCHAR(255)", allowNull: true },
        meta_description: { type: "VARCHAR(512)", allowNull: true },
        status: { type: "VARCHAR(32)", allowNull: false },
        featured: { type: "BOOLEAN", allowNull: false, defaultValue: false },
        reading_time: { type: "INTEGER", allowNull: true },
        view_count: { type: "INTEGER", allowNull: false, defaultValue: 0 },
        published_at: { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
        admin_id: { type: "UUID", allowNull: false },
        created_at: {
          type: "TIMESTAMP WITH TIME ZONE",
          allowNull: false,
          defaultValue: queryInterface.sequelize.literal("now()"),
        },
        updated_at: {
          type: "TIMESTAMP WITH TIME ZONE",
          allowNull: false,
          defaultValue: queryInterface.sequelize.literal("now()"),
        },
        deleted_at: { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
      },
      { transaction },
    );

    await ensureIndex(queryInterface, "posts", ["slug"], {
      name: "posts_slug_key",
      unique: true,
      transaction,
    });
    await ensureIndex(queryInterface, "posts", ["status"], {
      name: "posts_status",
      transaction,
    });
    await ensureIndex(queryInterface, "posts", ["admin_id"], {
      name: "posts_admin_id",
      transaction,
    });
    await ensureIndex(queryInterface, "posts", ["published_at"], {
      name: "posts_published_at",
      transaction,
    });
    await ensureIndex(queryInterface, "posts", ["view_count"], {
      name: "posts_view_count",
      transaction,
    });

    await ensureConstraint(queryInterface, "posts", {
      fields: ["admin_id"],
      type: "foreign key",
      name: "fk_posts_admin",
      references: { table: "admins", field: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeConstraint("posts", "fk_posts_admin", { transaction })
      .catch(() => {});
    await queryInterface.dropTable("posts", { transaction });
  });
}
