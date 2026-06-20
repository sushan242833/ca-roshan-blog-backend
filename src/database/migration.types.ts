import { QueryInterface } from "sequelize";

export interface MigrationDefinition {
  up: (queryInterface: QueryInterface) => Promise<void>;
  down?: (queryInterface: QueryInterface) => Promise<void>;
}

export interface MigrationRecord {
  id: string;
  name: string;
  executed_at: Date;
}

