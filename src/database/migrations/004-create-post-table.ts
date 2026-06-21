import { DataTypes, QueryInterface } from "sequelize";
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
        featured_image_id: { type: "UUID", allowNull: true },
        meta_title: { type: "VARCHAR(60)", allowNull: true },
        meta_description: { type: "VARCHAR(160)", allowNull: true },
        status: {
          type: DataTypes.ENUM("DRAFT", "PUBLISHED", "ARCHIVED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        featured: { type: "BOOLEAN", allowNull: false, defaultValue: false },
        reading_time: { type: "INTEGER", allowNull: false, defaultValue: 1 },
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
    await ensureIndex(queryInterface, "posts", ["featured_image_id"], {
      name: "posts_featured_image_id",
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
    await queryInterface.sequelize
      .query('DROP TYPE IF EXISTS "enum_posts_status";', { transaction })
      .catch(() => {});
  });
}
