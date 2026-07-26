import { QueryInterface } from "sequelize";
import { ensureColumn, ensureIndex } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Once-per-post dispatch marker: set the first time a post's newsletter is
    // scheduled, so a later DRAFT->PUBLISHED transition never re-sends it.
    await ensureColumn(
      queryInterface,
      "posts",
      "newsletter_sent_at",
      { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
      { transaction },
    );

    // Backfill: any post that already has delivery logs has been sent.
    await queryInterface.sequelize.query(
      `
        UPDATE posts p
        SET newsletter_sent_at = sub.first_sent
        FROM (
          SELECT post_id, MIN(created_at) AS first_sent
          FROM newsletter_logs
          GROUP BY post_id
        ) sub
        WHERE sub.post_id = p.id AND p.newsletter_sent_at IS NULL
      `,
      { transaction },
    );

    // Remove any pre-existing duplicate delivery rows before enforcing
    // uniqueness (defense-in-depth against duplicate sends).
    await queryInterface.sequelize.query(
      `
        DELETE FROM newsletter_logs a
        USING newsletter_logs b
        WHERE a.post_id = b.post_id
          AND a.subscriber_id = b.subscriber_id
          AND a.ctid < b.ctid
      `,
      { transaction },
    );

    await queryInterface
      .removeIndex("newsletter_logs", "newsletter_logs_post_subscriber", {
        transaction,
      })
      .catch(() => {});
    await ensureIndex(
      queryInterface,
      "newsletter_logs",
      ["post_id", "subscriber_id"],
      { name: "newsletter_logs_post_subscriber", unique: true, transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeIndex("newsletter_logs", "newsletter_logs_post_subscriber", {
        transaction,
      })
      .catch(() => {});
    await ensureIndex(
      queryInterface,
      "newsletter_logs",
      ["post_id", "subscriber_id"],
      { name: "newsletter_logs_post_subscriber", transaction },
    );
    await queryInterface
      .removeColumn("posts", "newsletter_sent_at", { transaction })
      .catch(() => {});
  });
}
