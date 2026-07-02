import "reflect-metadata";
import sequelize from "@config/config";
import { seed as seedAdmin } from "@database/seeders/001-admin-seeder";
import { registerModels } from "@models/index";

async function runSeed(): Promise<number> {
  registerModels(sequelize);

  try {
    await sequelize.authenticate();
    console.log("Database connected");

    await seedAdmin();

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

