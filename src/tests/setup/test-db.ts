import "reflect-metadata";
import { QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { env } from "@config/env";
import sequelize from "@config/config";
import { loadMigrations } from "@database/migration-loader";
import { MigrationHistoryRepository } from "@database/migration-history.repository";
import { registerModels } from "@models/index";

interface DatabaseRow {
  datname: string;
}

const TRUNCATED_TABLES = [
  "newsletter_logs",
  "post_tags",
  "post_categories",
  "posts",
  "subscribers",
  "categories",
  "tags",
  "media",
  "admins",
] as const;

let modelsRegistered = false;
let databaseReady = false;

function assertSafeTestDatabase(): void {
  if (env.NODE_ENV !== "test") {
    throw new Error("Test database setup requires NODE_ENV=test.");
  }

  if (!env.DB_NAME.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to run tests against non-test database "${env.DB_NAME}".`,
    );
  }
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(identifier)) {
    throw new Error(`Unsafe database identifier "${identifier}".`);
  }

  return `"${identifier.replace(/"/g, '""')}"`;
}

async function ensureTestDatabaseExists(): Promise<void> {
  const maintenanceConnection = new Sequelize({
    database: "postgres",
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: "postgres",
    logging: false,
  });

  try {
    await maintenanceConnection.authenticate();
    const existingDatabases = await maintenanceConnection.query<DatabaseRow>(
      "SELECT datname FROM pg_database WHERE datname = :databaseName",
      {
        replacements: { databaseName: env.DB_NAME },
        type: QueryTypes.SELECT,
      },
    );

    if (existingDatabases.length === 0) {
      await maintenanceConnection.query(
        `CREATE DATABASE ${quoteIdentifier(env.DB_NAME)}`,
      );
    }
  } finally {
    await maintenanceConnection.close();
  }
}

async function runTestMigrations(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const historyRepository = new MigrationHistoryRepository(queryInterface);

  await sequelize.transaction(async (transaction) => {
    await historyRepository.ensureTable(transaction);
  });

  const executedMigrationNames = await sequelize.transaction((transaction) =>
    historyRepository.listExecutedNames(transaction),
  );
  const migrations = await loadMigrations();

  for (const migration of migrations) {
    if (executedMigrationNames.has(migration.name)) {
      continue;
    }

    await migration.definition.up(queryInterface);
    await sequelize.transaction(async (transaction) => {
      await historyRepository.recordExecution(migration.name, transaction);
    });
  }
}

export async function setupTestDatabase(): Promise<void> {
  if (databaseReady) {
    return;
  }

  assertSafeTestDatabase();
  await ensureTestDatabaseExists();

  if (!modelsRegistered) {
    registerModels(sequelize);
    modelsRegistered = true;
  }

  await sequelize.authenticate();
  await runTestMigrations();
  databaseReady = true;
}

export async function resetTestDatabase(): Promise<void> {
  assertSafeTestDatabase();
  await sequelize.query(
    `TRUNCATE TABLE ${TRUNCATED_TABLES.map(quoteIdentifier).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

export async function closeTestDatabase(): Promise<void> {
  if (!databaseReady) {
    return;
  }

  await sequelize.close();
  databaseReady = false;
  modelsRegistered = false;
}
