import { QueryInterface, QueryTypes, Transaction } from "sequelize";

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

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    if (await columnExists(queryInterface, "verified", transaction)) {
      await queryInterface.removeColumn("subscribers", "verified", {
        transaction,
      });
    }

    if (await columnExists(queryInterface, "subscribed_at", transaction)) {
      await queryInterface.removeColumn("subscribers", "subscribed_at", {
        transaction,
      });
    }
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    if (!(await columnExists(queryInterface, "verified", transaction))) {
      await queryInterface.addColumn(
        "subscribers",
        "verified",
        {
          type: "BOOLEAN",
          allowNull: false,
          defaultValue: false,
        },
        { transaction },
      );
    }

    if (!(await columnExists(queryInterface, "subscribed_at", transaction))) {
      await queryInterface.addColumn(
        "subscribers",
        "subscribed_at",
        {
          type: "TIMESTAMP WITH TIME ZONE",
          allowNull: true,
        },
        { transaction },
      );
    }
  });
}
