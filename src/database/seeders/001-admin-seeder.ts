import { QueryInterface } from "sequelize";
import { QueryTypes } from "sequelize";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || !name) {
      // skip seeding when env not provided
      // eslint-disable-next-line no-console
      console.warn(
        "ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin seeder",
      );
      return;
    }

    const existing = await queryInterface.sequelize.query<{ id: string }>(
      "SELECT id FROM admins WHERE email = :email LIMIT 1",
      {
        replacements: { email },
        transaction,
        type: QueryTypes.SELECT,
      },
    );

    if (existing.length > 0) return;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await queryInterface.bulkInsert(
      "admins",
      [
        {
          id: queryInterface.sequelize.literal("gen_random_uuid()"),
          name,
          email,
          password_hash: passwordHash,
          is_active: true,
          created_at: queryInterface.sequelize.literal("now()"),
          updated_at: queryInterface.sequelize.literal("now()"),
        },
      ],
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    const email = process.env.ADMIN_EMAIL;
    if (!email) return;
    await queryInterface.bulkDelete("admins", { email }, { transaction });
  });
}
