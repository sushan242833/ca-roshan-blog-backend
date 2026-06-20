import fs from "fs";
import path from "path";
import { MigrationDefinition } from "@database/migration.types";

export interface LoadedMigration {
  name: string;
  definition: MigrationDefinition;
}

function isMigrationFile(fileName: string): boolean {
  return /^\d+.*\.(js|ts)$/.test(fileName) && !fileName.endsWith(".d.ts");
}

export async function loadMigrations(): Promise<LoadedMigration[]> {
  const migrationsDirectory = path.resolve(__dirname, "migrations");
  const fileNames = fs
    .readdirSync(migrationsDirectory)
    .filter(isMigrationFile)
    .sort((left, right) => left.localeCompare(right));

  const migrations: LoadedMigration[] = [];

  for (const fileName of fileNames) {
    const migrationPath = path.join(migrationsDirectory, fileName);
    const loadedModule = (await import(migrationPath)) as MigrationDefinition;

    if (typeof loadedModule.up !== "function") {
      throw new Error(`Migration ${fileName} does not export an up function.`);
    }

    migrations.push({
      name: fileName,
      definition: loadedModule,
    });
  }

  return migrations;
}

