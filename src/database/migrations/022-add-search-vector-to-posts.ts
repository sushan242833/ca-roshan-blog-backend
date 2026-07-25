import { QueryInterface, QueryTypes } from "sequelize";
import { ensureIndex } from "@database/utils/migration-utils";

// Text search configuration. The current corpus (and the site's published
// content) is entirely English/Latin-script — confirmed no Devanagari — so
// 'english' is used for its stemming ("taxes" matches "tax"). If Nepali /
// Devanagari content is ever added, revisit toward 'simple', which does not
// mis-stem non-English tokens.
const SEARCH_CONFIG = "english";

interface ExistingColumnRow {
  column_name: string;
}

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Weighted generated tsvector: title (A) > excerpt (B) > body text (C).
    // search_text (migration 021) is the HTML-stripped body, so the vector
    // never indexes raw markup. STORED means it is materialised and indexable.
    // addColumn cannot express GENERATED ... STORED, so raw SQL is used, guarded
    // by an existence check in the same style as ensureColumn.
    const existing = await queryInterface.sequelize.query<ExistingColumnRow>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'posts'
          AND column_name = 'search_vector'
      `,
      { transaction, type: QueryTypes.SELECT },
    );

    if (existing.length === 0) {
      await queryInterface.sequelize.query(
        `
          ALTER TABLE posts ADD COLUMN search_vector tsvector
          GENERATED ALWAYS AS (
            setweight(to_tsvector('${SEARCH_CONFIG}', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('${SEARCH_CONFIG}', coalesce(excerpt, '')), 'B') ||
            setweight(to_tsvector('${SEARCH_CONFIG}', coalesce(search_text, '')), 'C')
          ) STORED
        `,
        { transaction },
      );
    }

    // GIN index so the @@ match uses a bitmap index scan, not a seq scan.
    await ensureIndex(queryInterface, "posts", ["search_vector"], {
      name: "posts_search_vector_gin",
      using: "gin",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeIndex("posts", "posts_search_vector_gin", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("posts", "search_vector", { transaction })
      .catch(() => {});
  });
}
