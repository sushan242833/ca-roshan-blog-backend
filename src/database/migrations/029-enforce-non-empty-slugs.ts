import { QueryInterface, QueryTypes } from "sequelize";

const SLUG_TABLES = [
  { table: "posts", prefix: "post" },
  { table: "categories", prefix: "category" },
  { table: "tags", prefix: "tag" },
] as const;

interface ExistingTableRow {
  tablename: string;
}

interface SlugRow {
  id: string;
}

async function tableExists(
  queryInterface: QueryInterface,
  tableName: string,
  transaction: unknown,
): Promise<boolean> {
  const rows = await queryInterface.sequelize.query<ExistingTableRow>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = :tableName`,
    {
      replacements: { tableName },
      type: QueryTypes.SELECT,
      transaction: transaction as never,
    },
  );
  return rows.length > 0;
}

async function constraintExists(
  queryInterface: QueryInterface,
  constraintName: string,
  transaction: unknown,
): Promise<boolean> {
  const rows = await queryInterface.sequelize.query<{ conname: string }>(
    `SELECT conname FROM pg_constraint WHERE conname = :constraintName`,
    {
      replacements: { constraintName },
      type: QueryTypes.SELECT,
      transaction: transaction as never,
    },
  );
  return rows.length > 0;
}

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    for (const { table, prefix } of SLUG_TABLES) {
      if (!(await tableExists(queryInterface, table, transaction))) {
        continue;
      }

      // Repair rows written before the Unicode-aware slugify. The id suffix
      // keeps the replacement unique without needing a retry loop.
      const broken = await queryInterface.sequelize.query<SlugRow>(
        `SELECT id FROM "${table}" WHERE slug IS NULL OR btrim(slug) = ''`,
        { type: QueryTypes.SELECT, transaction },
      );

      for (const row of broken) {
        await queryInterface.sequelize.query(
          `UPDATE "${table}" SET slug = :slug WHERE id = :id`,
          {
            replacements: {
              slug: `${prefix}-${row.id.slice(0, 8)}`,
              id: row.id,
            },
            transaction,
          },
        );
      }

      const constraintName = `${table}_slug_not_empty`;
      if (await constraintExists(queryInterface, constraintName, transaction)) {
        continue;
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" CHECK (btrim(slug) <> '')`,
        { transaction },
      );
    }
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    for (const { table } of SLUG_TABLES) {
      await queryInterface.sequelize
        .query(
          `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_slug_not_empty"`,
          { transaction },
        )
        .catch(() => {});
    }
  });
}
