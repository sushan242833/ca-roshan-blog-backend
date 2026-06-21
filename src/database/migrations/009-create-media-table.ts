import { DataTypes, QueryInterface } from "sequelize";
import { ensureIndex, ensureTable } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureTable(
      queryInterface,
      "media",
      {
        id: {
          type: "UUID",
          allowNull: false,
          primaryKey: true,
          defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
        },
        file_name: { type: "VARCHAR(255)", allowNull: false },
        original_name: { type: "VARCHAR(255)", allowNull: false },
        mime_type: { type: "VARCHAR(128)", allowNull: false },
        size: { type: "INTEGER", allowNull: false },
        url: { type: "VARCHAR(2048)", allowNull: false },
        provider: {
          type: DataTypes.ENUM("LOCAL", "S3", "CLOUDINARY"),
          allowNull: false,
          defaultValue: "LOCAL",
        },
        created_at: {
          type: "TIMESTAMP WITH TIME ZONE",
          allowNull: false,
          defaultValue: queryInterface.sequelize.literal("now()"),
        },
        updated_at: {
          type: "TIMESTAMP WITH TIME ZONE",
          allowNull: false,
          defaultValue: queryInterface.sequelize.literal("now()"),
        },
        deleted_at: { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
      },
      { transaction },
    );

    await ensureIndex(queryInterface, "media", ["file_name"], {
      name: "media_file_name_key",
      unique: true,
      transaction,
    });

    await ensureIndex(queryInterface, "media", ["provider"], {
      name: "media_provider",
      transaction,
    });

    await ensureIndex(queryInterface, "media", ["created_at"], {
      name: "media_created_at",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable("media", { transaction });
    await queryInterface.sequelize
      .query('DROP TYPE IF EXISTS "enum_media_provider";', { transaction })
      .catch(() => {});
  });
}
