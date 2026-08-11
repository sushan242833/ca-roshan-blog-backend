import { QueryInterface } from "sequelize";
import {
  ensureColumn,
  ensureConstraint,
  ensureIndex,
  ensureTable,
} from "@database/utils/migration-utils";

// Persisted chapter split for large posts. `posts.content` remains the editable
// source of truth; these rows are a derived projection of it, rebuilt from
// scratch whenever the body is written (see post-chapter.service). Persisting
// them is what lets a chapter read fetch one chapter's bytes instead of the
// whole multi-MB body, which was the main driver of database egress.
export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureTable(
      queryInterface,
      "post_chapters",
      {
        id: {
          type: "UUID",
          allowNull: false,
          primaryKey: true,
          defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
        },
        post_id: { type: "UUID", allowNull: false },
        // The stable, slug-derived id from splitIntoChapters. It is what appears
        // in chapter URLs, so it must survive a regeneration unchanged.
        chapter_id: { type: "VARCHAR(255)", allowNull: false },
        // "order" is a reserved word in Postgres; Sequelize quotes it here and
        // in every generated query, so it stays addressable as a plain column.
        order: { type: "INTEGER", allowNull: false },
        // Chapter titles come from headings, which can run much longer than a
        // post title, hence 512 rather than the posts.title 255.
        title: { type: "VARCHAR(512)", allowNull: false },
        excerpt: { type: "TEXT", allowNull: true },
        html: { type: "TEXT", allowNull: false },
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
      },
      { transaction },
    );

    // One row per chapter id per post — the lookup a chapter page performs.
    await ensureIndex(queryInterface, "post_chapters", ["post_id", "chapter_id"], {
      name: "post_chapters_post_id_chapter_id_key",
      unique: true,
      transaction,
    });

    // Ordered listing (the index page) and the prev/next probes.
    await ensureIndex(queryInterface, "post_chapters", ["post_id", "order"], {
      name: "post_chapters_post_id_order",
      transaction,
    });

    await ensureConstraint(queryInterface, "post_chapters", {
      fields: ["post_id"],
      type: "foreign key",
      name: "fk_post_chapters_post",
      references: { table: "posts", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      transaction,
    });

    // Denormalised onto the post so the index page can answer "is this post
    // paginated, and how many chapters?" without touching post_chapters or the
    // body at all. Defaults mean every existing post keeps its current
    // single-page behaviour until the backfill runs.
    await ensureColumn(
      queryInterface,
      "posts",
      "paginated",
      { type: "BOOLEAN", allowNull: false, defaultValue: false },
      { transaction },
    );

    await ensureColumn(
      queryInterface,
      "posts",
      "chapter_count",
      { type: "INTEGER", allowNull: false, defaultValue: 1 },
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeColumn("posts", "chapter_count", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("posts", "paginated", { transaction })
      .catch(() => {});
    await queryInterface
      .removeConstraint("post_chapters", "fk_post_chapters_post", { transaction })
      .catch(() => {});
    await queryInterface.dropTable("post_chapters", { transaction });
  });
}
