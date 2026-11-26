import { QueryInterface } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Posts featured before slots existed get the free slots, newest first, so
    // the Featured Insights page starts out showing what the home page shows.
    // Slots already taken are left alone; featured posts beyond the free slots
    // stay featured and unslotted.
    await queryInterface.sequelize.query(
      `
      WITH free AS (
        SELECT position, ROW_NUMBER() OVER (ORDER BY position) AS rn
        FROM generate_series(1, 6) AS position
        WHERE position NOT IN (
          SELECT featured_position FROM posts
          WHERE featured_position IS NOT NULL AND deleted_at IS NULL
        )
      ),
      waiting AS (
        SELECT id, ROW_NUMBER() OVER (
          ORDER BY published_at DESC NULLS LAST, id DESC
        ) AS rn
        FROM posts
        WHERE featured = true
          AND status = 'PUBLISHED'
          AND featured_position IS NULL
          AND deleted_at IS NULL
      )
      UPDATE posts
      SET featured_position = free.position
      FROM waiting
      JOIN free ON free.rn = waiting.rn
      WHERE posts.id = waiting.id
      `,
      { transaction },
    );
  });
}

// A data backfill: which positions it filled is not recorded, and slots
// arranged since then must not be undone, so there is nothing to reverse.
export async function down() {}
