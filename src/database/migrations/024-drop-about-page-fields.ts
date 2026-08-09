import { QueryInterface, QueryTypes, Transaction } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

// Reverses 016-expand-about-page-fields. The About page is now a static
// frontend file, so these columns have no reader left.
//
// Deliberately NOT dropped: name, title, bio, avatar_url. Those predate the
// About feature (014-add-author-profile-to-admins) and still feed the author
// byline embedded in every post response. The admins table itself also holds
// the auth columns (email, password_hash, refresh_token_hash), so it stays.
const ABOUT_ONLY_COLUMNS = [
  "location",
  "years_of_experience",
  "qualification",
  "bio_paragraph2",
  "professional_quote",
  "expertise",
  "closing_message",
  "seo_title",
  "seo_description",
  "og_image_url",
] as const;

// Column definitions mirrored from 016 so `down` restores the original shape.
// The data itself is gone for good — this only rebuilds the columns.
const COLUMN_DEFINITIONS: Record<string, { type: string; allowNull: boolean }> =
  {
    location: { type: "VARCHAR(200)", allowNull: true },
    years_of_experience: { type: "VARCHAR(100)", allowNull: true },
    qualification: { type: "VARCHAR(300)", allowNull: true },
    bio_paragraph2: { type: "TEXT", allowNull: true },
    professional_quote: { type: "TEXT", allowNull: true },
    expertise: { type: "TEXT", allowNull: true },
    closing_message: { type: "TEXT", allowNull: true },
    seo_title: { type: "VARCHAR(60)", allowNull: true },
    seo_description: { type: "VARCHAR(160)", allowNull: true },
    og_image_url: { type: "VARCHAR(500)", allowNull: true },
  };

interface ExistingColumnRow {
  column_name: string;
}

async function columnExists(
  queryInterface: QueryInterface,
  columnName: string,
  transaction: Transaction,
): Promise<boolean> {
  const columns = await queryInterface.sequelize.query<ExistingColumnRow>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'admins'
        AND column_name = :columnName
    `,
    {
      replacements: { columnName },
      transaction,
      type: QueryTypes.SELECT,
    },
  );

  return columns.length > 0;
}

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    for (const columnName of ABOUT_ONLY_COLUMNS) {
      if (await columnExists(queryInterface, columnName, transaction)) {
        await queryInterface.removeColumn("admins", columnName, {
          transaction,
        });
      }
    }
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    for (const columnName of ABOUT_ONLY_COLUMNS) {
      await ensureColumn(
        queryInterface,
        "admins",
        columnName,
        COLUMN_DEFINITIONS[columnName]!,
        { transaction },
      );
    }
  });
}
