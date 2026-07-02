import { QueryInterface } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureColumn(
      queryInterface,
      "admins",
      "location",
      { type: "VARCHAR(200)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "years_of_experience",
      { type: "VARCHAR(100)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "qualification",
      { type: "VARCHAR(300)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "bio_paragraph2",
      { type: "TEXT", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "professional_quote",
      { type: "TEXT", allowNull: true },
      { transaction },
    );
    // Stored as a JSON string (not JSONB) so the same column type works
    // on both PostgreSQL and SQLite (used in tests). Represents an array
    // of { title: string; description: string } objects.
    await ensureColumn(
      queryInterface,
      "admins",
      "expertise",
      { type: "TEXT", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "closing_message",
      { type: "TEXT", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "seo_title",
      { type: "VARCHAR(60)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "seo_description",
      { type: "VARCHAR(160)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "admins",
      "og_image_url",
      { type: "VARCHAR(500)", allowNull: true },
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeColumn("admins", "location", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "years_of_experience", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "qualification", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "bio_paragraph2", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "professional_quote", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "expertise", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "closing_message", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "seo_title", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "seo_description", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("admins", "og_image_url", { transaction })
      .catch(() => {});
  });
}
