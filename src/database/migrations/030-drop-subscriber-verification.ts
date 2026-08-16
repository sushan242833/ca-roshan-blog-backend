import { QueryInterface, QueryTypes, Transaction } from "sequelize";

const VERIFICATION_COLUMNS = [
  "verification_token",
  "verification_token_expires_at",
  "verified_at",
] as const;

interface ExistingColumnRow {
  column_name: string;
}

async function columnExists(
  queryInterface: QueryInterface,
  columnName: string,
  transaction: Transaction,
): Promise<boolean> {
  const columns = await queryInterface.sequelize.query<ExistingColumnRow>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'subscribers'
        AND column_name = :columnName
    `,
    {
      replacements: { columnName },
      transaction,
      type: QueryTypes.SELECT,
    },
  );

  return columns.length > 0;
}

/**
 * Postgres cannot remove a value from an enum type in place, so the type is
 * rebuilt with the surviving values and the column swapped over to it.
 */
async function replaceStatusEnum(
  queryInterface: QueryInterface,
  values: readonly string[],
  defaultValue: string,
  transaction: Transaction,
): Promise<void> {
  const sql = queryInterface.sequelize;
  const literals = values.map((value) => `'${value}'`).join(", ");

  await sql.query(
    `ALTER TYPE "enum_subscribers_status" RENAME TO "enum_subscribers_status_old"`,
    { transaction },
  );
  await sql.query(
    `CREATE TYPE "enum_subscribers_status" AS ENUM (${literals})`,
    {
      transaction,
    },
  );
  await sql.query(
    `ALTER TABLE "subscribers" ALTER COLUMN "status" DROP DEFAULT`,
    {
      transaction,
    },
  );
  await sql.query(
    `
      ALTER TABLE "subscribers"
        ALTER COLUMN "status" TYPE "enum_subscribers_status"
        USING "status"::text::"enum_subscribers_status"
    `,
    { transaction },
  );
  await sql.query(
    `
      ALTER TABLE "subscribers"
        ALTER COLUMN "status" SET DEFAULT '${defaultValue}'::"enum_subscribers_status"
    `,
    { transaction },
  );
  await sql.query(`DROP TYPE "enum_subscribers_status_old"`, { transaction });
}

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Carry unconfirmed sign-ups over before the value disappears from the enum.
    await queryInterface.sequelize.query(
      `UPDATE "subscribers" SET "status" = 'ACTIVE' WHERE "status" = 'PENDING'`,
      { transaction },
    );

    await replaceStatusEnum(
      queryInterface,
      ["ACTIVE", "UNSUBSCRIBED"],
      "ACTIVE",
      transaction,
    );

    // Dropping the column takes its unique index
    // (subscribers_verification_token_key) with it.
    for (const column of VERIFICATION_COLUMNS) {
      if (await columnExists(queryInterface, column, transaction)) {
        await queryInterface.removeColumn("subscribers", column, {
          transaction,
        });
      }
    }
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await replaceStatusEnum(
      queryInterface,
      ["PENDING", "ACTIVE", "UNSUBSCRIBED"],
      "PENDING",
      transaction,
    );

    if (
      !(await columnExists(queryInterface, "verification_token", transaction))
    ) {
      await queryInterface.addColumn(
        "subscribers",
        "verification_token",
        { type: "VARCHAR(255)", allowNull: true, unique: true },
        { transaction },
      );
    }

    if (
      !(await columnExists(
        queryInterface,
        "verification_token_expires_at",
        transaction,
      ))
    ) {
      await queryInterface.addColumn(
        "subscribers",
        "verification_token_expires_at",
        { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
        { transaction },
      );
    }

    if (!(await columnExists(queryInterface, "verified_at", transaction))) {
      await queryInterface.addColumn(
        "subscribers",
        "verified_at",
        { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
        { transaction },
      );
    }
  });
}
