import "reflect-metadata";
import sequelize from "@config/config";
import { registerModels } from "@models/index";
import { MigrationHistoryRepository } from "@database/migration-history.repository";
import { loadMigrations } from "@database/migration-loader";

async function runMigrations(): Promise<number> {
  registerModels(sequelize);

  try {
    await sequelize.authenticate();
    console.log("Database connected");

    const queryInterface = sequelize.getQueryInterface();
    const historyRepository = new MigrationHistoryRepository(queryInterface);

    await sequelize.transaction(async (transaction) => {
      await historyRepository.ensureTable(transaction);
      console.log("Migration history checked");

      const executedMigrationNames = await historyRepository.listExecutedNames(transaction);
      const migrations = await loadMigrations();
      const pendingMigrations = migrations.filter(
        (migration) => !executedMigrationNames.has(migration.name),
      );

      if (pendingMigrations.length === 0) {
        console.log("No pending migrations");
        return;
      }

      for (const migration of pendingMigrations) {
        console.log(`Running migration: ${migration.name}`);
        await migration.definition.up(queryInterface);
        await historyRepository.recordExecution(migration.name, transaction);
        console.log(`Completed migration: ${migration.name}`);
      }
    });

    console.log("All pending migrations executed successfully");
    return 0;
  } catch (error) {
    console.error("Migration execution failed", error);
    return 1;
  } finally {
    await sequelize.close().catch((closeError: unknown) => {
      console.error("Failed to close database connection cleanly", closeError);
    });
  }
}

void runMigrations().then((exitCode) => {
  process.exit(exitCode);
});

