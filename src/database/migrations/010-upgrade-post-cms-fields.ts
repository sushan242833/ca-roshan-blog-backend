import { QueryInterface } from "sequelize";
import {
  ensureColumn,
  ensureConstraint,
  ensureIndex,
} from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `
        DO $$
        BEGIN
          CREATE TYPE "enum_posts_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `,
      { transaction },
    );

    await ensureColumn(
      queryInterface,
      "posts",
      "excerpt",
      { type: "TEXT", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "posts",
      "featured_image_id",
      { type: "UUID", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "posts",
      "meta_title",
      { type: "VARCHAR(60)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "posts",
      "meta_description",
      { type: "VARCHAR(160)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "posts",
      "status",
      { type: "VARCHAR(32)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "posts",
      "featured",
      { type: "BOOLEAN", allowNull: false, defaultValue: false },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "posts",
      "reading_time",
      { type: "INTEGER", allowNull: false, defaultValue: 1 },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "posts",
      "view_count",
      { type: "INTEGER", allowNull: false, defaultValue: 0 },
      { transaction },
    );

    await queryInterface.sequelize.query(
      `
        DO $$
        DECLARE
          status_udt_name text;
        BEGIN
          SELECT udt_name
          INTO status_udt_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'posts'
            AND column_name = 'status';

          IF status_udt_name = 'enum_posts_status' THEN
            UPDATE posts
            SET status = CASE
              WHEN published_at IS NOT NULL THEN 'PUBLISHED'::"enum_posts_status"
              ELSE 'DRAFT'::"enum_posts_status"
            END
            WHERE status IS NULL
              OR status::text NOT IN ('DRAFT', 'PUBLISHED', 'ARCHIVED');
          ELSE
            UPDATE posts
            SET status = CASE
              WHEN published_at IS NOT NULL THEN 'PUBLISHED'
              ELSE 'DRAFT'
            END
            WHERE status IS NULL
              OR status::text NOT IN ('DRAFT', 'PUBLISHED', 'ARCHIVED');
          END IF;
        END $$;

        UPDATE posts
        SET reading_time = GREATEST(
          1,
          CEIL(
            GREATEST(
              1,
              array_length(regexp_split_to_array(trim(content), '\\s+'), 1)
            ) / 200.0
          )::INTEGER
        )
        WHERE reading_time IS NULL OR reading_time < 1;

        ALTER TABLE posts
          ALTER COLUMN status TYPE "enum_posts_status"
          USING status::text::"enum_posts_status",
          ALTER COLUMN status SET DEFAULT 'DRAFT',
          ALTER COLUMN status SET NOT NULL,
          ALTER COLUMN featured SET DEFAULT false,
          ALTER COLUMN featured SET NOT NULL,
          ALTER COLUMN reading_time SET DEFAULT 1,
          ALTER COLUMN reading_time SET NOT NULL,
          ALTER COLUMN view_count SET DEFAULT 0,
          ALTER COLUMN view_count SET NOT NULL;
      `,
      { transaction },
    );

    await ensureIndex(queryInterface, "posts", ["featured_image_id"], {
      name: "posts_featured_image_id",
      transaction,
    });
    await ensureIndex(queryInterface, "posts", ["featured"], {
      name: "posts_featured",
      transaction,
    });

    await ensureConstraint(queryInterface, "posts", {
      fields: ["featured_image_id"],
      type: "foreign key",
      name: "fk_posts_featured_image",
      references: { table: "media", field: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeConstraint("posts", "fk_posts_featured_image", { transaction })
      .catch(() => {});
    await queryInterface
      .removeIndex("posts", "posts_featured_image_id", { transaction })
      .catch(() => {});
    await queryInterface
      .removeIndex("posts", "posts_featured", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("posts", "featured_image_id", { transaction })
      .catch(() => {});
  });
}
