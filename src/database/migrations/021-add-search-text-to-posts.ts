import { QueryInterface } from "sequelize";
import { ensureColumn, ensureIndex } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Plain-text projection of `content` used for searching, so queries never
    // match against raw HTML (div, span, href, class, hex colour codes…) or
    // surface a post that has no reader-visible occurrence of the term.
    // Nullable: rows with a NULL search_text fall back to `content` at query
    // time, so search keeps working if this backfill is ever incomplete.
    await ensureColumn(
      queryInterface,
      "posts",
      "search_text",
      { type: "TEXT", allowNull: true },
      { transaction },
    );

    // Backfill existing rows with a SQL-side tag strip + whitespace collapse.
    // New and updated rows get the richer JS stripHtml() in the service layer.
    await queryInterface.sequelize.query(
      `
        UPDATE posts
        SET search_text = trim(
          regexp_replace(
            regexp_replace(content, '<[^>]*>', ' ', 'g'),
            '\\s+', ' ', 'g'
          )
        )
        WHERE search_text IS NULL
      `,
      { transaction },
    );

    // The default public listing filters by status and sorts by published_at.
    // A composite index serves that combined filter-and-sort better than the
    // existing single-column posts_status / posts_published_at indexes.
    await ensureIndex(queryInterface, "posts", ["status", "published_at"], {
      name: "posts_status_published_at",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeIndex("posts", "posts_status_published_at", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("posts", "search_text", { transaction })
      .catch(() => {});
  });
}
