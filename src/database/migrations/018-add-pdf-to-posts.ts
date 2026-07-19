import { QueryInterface } from "sequelize";
import { ensureColumn } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Optional "Full content PDF" attachment: a link to a hosted PDF plus an
    // optional custom label. Both are nullable — a post without a PDF simply
    // leaves them null, and the default link text is handled on the frontend.
    await ensureColumn(
      queryInterface,
      "posts",
      "pdf_url",
      { type: "VARCHAR(2048)", allowNull: true },
      { transaction },
    );

    await ensureColumn(
      queryInterface,
      "posts",
      "pdf_label",
      { type: "VARCHAR(255)", allowNull: true },
      { transaction },
    );
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeColumn("posts", "pdf_url", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("posts", "pdf_label", { transaction })
      .catch(() => {});
  });
}
