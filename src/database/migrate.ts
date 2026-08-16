import "reflect-metadata";
import sequelize from "@config/config";
import { registerModels } from "@models/index";
import { MigrationHistoryRepository } from "@database/migration-history.repository";
import { loadMigrations } from "@database/migration-loader";

// Arbitrary but fixed application-wide id for the migration advisory lock.
// Session-scoped (pg_advisory_lock, not _xact) so it spans the DDL, which each
// migration runs in its own transaction.
const MIGRATION_LOCK_ID = 48207731;

async function runMigrations(): Promise<number> {
  registerModels(sequelize);
  let lockHeld = false;

  try {
    await sequelize.authenticate();
    console.log("Database connected");

    // The deployment runs this as a single release step, so two migrators
    // should never overlap. This lock is the backstop for when that assumption
    // breaks — a retried release, a manual run during a deploy, a platform that
    // starts the release job twice. The second waits rather than interleaving
    // DDL with the first and corrupting the history table.
    await sequelize.query(`SELECT pg_advisory_lock(${MIGRATION_LOCK_ID})`);
    lockHeld = true;

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
    if (lockHeld) {
      await sequelize
        .query(`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`)
        .catch(() => {});
    }
    await sequelize.close().catch((closeError: unknown) => {
      console.error("Failed to close database connection cleanly", closeError);
    });
  }
}

void runMigrations().then((exitCode) => {
  process.exit(exitCode);
});

