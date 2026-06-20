import { QueryInterface, QueryTypes, Transaction } from "sequelize";
import { randomUUID } from "crypto";
import { MigrationRecord } from "@database/migration.types";

const TABLE_NAME = "migration_history";

export class MigrationHistoryRepository {
  public constructor(private readonly queryInterface: QueryInterface) {}

  public async ensureTable(transaction: Transaction): Promise<void> {
    await this.queryInterface.sequelize.query(
      `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `,
      { transaction },
    );
  }

  public async listExecutedNames(transaction: Transaction): Promise<Set<string>> {
    const rows = await this.queryInterface.sequelize.query<MigrationRecord>(
      `SELECT id, name, executed_at FROM ${TABLE_NAME} ORDER BY executed_at ASC, name ASC`,
      {
        transaction,
        type: QueryTypes.SELECT,
      },
    );

    return new Set(rows.map((row) => row.name));
  }

  public async recordExecution(name: string, transaction: Transaction): Promise<void> {
    await this.queryInterface.sequelize.query(
      `
        INSERT INTO ${TABLE_NAME} (id, name, executed_at)
        VALUES (:id, :name, NOW())
      `,
      {
        replacements: {
          id: randomUUID(),
          name,
        },
        transaction,
      },
    );
  }
}

