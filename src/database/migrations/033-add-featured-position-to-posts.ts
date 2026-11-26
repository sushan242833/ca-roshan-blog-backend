import { QueryInterface, QueryTypes, Transaction } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

const CHECK_CONSTRAINT = "posts_featured_position_range";
const UNIQUE_INDEX = "posts_featured_position_unique";

async function constraintExists(
  queryInterface: QueryInterface,
  constraintName: string,
  transaction: Transaction,
): Promise<boolean> {
  const rows = await queryInterface.sequelize.query<{ conname: string }>(
    `SELECT conname FROM pg_constraint WHERE conname = :constraintName`,
    {
      replacements: { constraintName },
      type: QueryTypes.SELECT,
      transaction,
    },
  );
  return rows.length > 0;
}

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // The slot (1-6) a post holds in the home page's "Featured Insights"
    // section, or NULL when it holds none. Set only through the admin
    // featured-posts endpoint; the post service clears it whenever the post
    // stops being publicly visible or stops being featured.
    await ensureColumn(
      queryInterface,
      "posts",
      "featured_position",
      { type: "SMALLINT", allowNull: true },
      { transaction },
    );

    if (!(await constraintExists(queryInterface, CHECK_CONSTRAINT, transaction))) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "posts" ADD CONSTRAINT "${CHECK_CONSTRAINT}" ` +
          `CHECK (featured_position IS NULL OR featured_position BETWEEN 1 AND 6)`,
        { transaction },
      );
    }

    // Partial, so any number of posts can hold no slot and a trashed post can
    // never block a live one from taking its old slot.
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${UNIQUE_INDEX}" ON "posts" (featured_position) ` +
        `WHERE featured_position IS NOT NULL AND deleted_at IS NULL`,
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS "${UNIQUE_INDEX}"`,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "${CHECK_CONSTRAINT}"`,
      { transaction },
    );
    await queryInterface
      .removeColumn("posts", "featured_position", { transaction })
      .catch(() => {});
  });
}
