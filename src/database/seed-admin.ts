import "reflect-metadata";
import sequelize from "@config/config";
import { QueryInterface } from "sequelize";
import { up as seedAdmin } from "@database/seeders/001-admin-seeder";
import { registerModels } from "@models/index";

async function runSeed(): Promise<number> {
  registerModels(sequelize);

  try {
    await sequelize.authenticate();
    console.log("Database connected");

    const queryInterface: QueryInterface = sequelize.getQueryInterface();
    await seedAdmin(queryInterface);

    console.log("Admin seed completed");
    return 0;
  } catch (error) {
    console.error("Admin seed failed", error);
    return 1;
  } finally {
    await sequelize.close().catch((closeError: unknown) => {
      console.error("Failed to close database connection cleanly", closeError);
    });
  }
}

void runSeed().then((exitCode) => {
  process.exit(exitCode);
});

