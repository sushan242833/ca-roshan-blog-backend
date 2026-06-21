import {
  AddForeignKeyConstraintOptions,
  IndexesOptions,
  ModelAttributeColumnOptions,
  QueryInterface,
  QueryTypes,
  Transaction,
} from "sequelize";

type TableColumns = Record<string, ModelAttributeColumnOptions>;

interface EnsureTableOptions {
  transaction: Transaction;
}

interface ExistingIndexRow {
  indexname: string;
}

interface ExistingTableRow {
  tablename: string;
}

interface ExistingConstraintRow {
  constraint_name: string;
}

interface ExistingColumnRow {
  column_name: string;
}

function normalizeIndexName(tableName: string, fields: string[]): string {
  return `${tableName}_${fields.join("_")}`;
}

export async function ensureTable(
  queryInterface: QueryInterface,
  tableName: string,
  columns: TableColumns,
  options: EnsureTableOptions,
): Promise<void> {
  const existingTables = await queryInterface.sequelize.query<ExistingTableRow>(
    `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = :tableName
    `,
    {
      replacements: { tableName },
      transaction: options.transaction,
      type: QueryTypes.SELECT,
    },
  );

  if (existingTables.length > 0) {
    return;
  }

  await queryInterface.createTable(tableName, columns, {
    transaction: options.transaction,
  });
}

export async function ensureColumn(
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  column: ModelAttributeColumnOptions,
  options: EnsureTableOptions,
): Promise<void> {
  const existingColumns = await queryInterface.sequelize.query<ExistingColumnRow>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :tableName
        AND column_name = :columnName
    `,
    {
      replacements: { tableName, columnName },
      transaction: options.transaction,
      type: QueryTypes.SELECT,
    },
  );

  if (existingColumns.length > 0) {
    return;
  }

  await queryInterface.addColumn(tableName, columnName, column, {
    transaction: options.transaction,
  });
}

export async function ensureIndex(
  queryInterface: QueryInterface,
  tableName: string,
  fields: string[],
  options: Omit<IndexesOptions, "fields"> & { transaction: Transaction; name?: string },
): Promise<void> {
  const indexName = options.name ?? normalizeIndexName(tableName, fields);
  const existingIndexes = await queryInterface.sequelize.query<ExistingIndexRow>(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = :indexName
    `,
    {
      replacements: { indexName },
      transaction: options.transaction,
      type: QueryTypes.SELECT,
    },
  );

  if (existingIndexes.length > 0) {
    return;
  }

  await queryInterface.addIndex(tableName, fields, {
    ...options,
    name: indexName,
  });
}

export async function ensureConstraint(
  queryInterface: QueryInterface,
  tableName: string,
  options: AddForeignKeyConstraintOptions & { transaction: Transaction },
): Promise<void> {
  const existingConstraints = await queryInterface.sequelize.query<ExistingConstraintRow>(
    `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = :tableName
        AND constraint_name = :constraintName
    `,
    {
      replacements: {
        tableName,
        constraintName: options.name,
      },
      transaction: options.transaction,
      type: QueryTypes.SELECT,
    },
  );

  if (existingConstraints.length > 0) {
    return;
  }

  await queryInterface.addConstraint(tableName, options);
}
