import { QueryInterface, Transaction } from "sequelize";

// Existing posts stored the full Cloudinary raw URL for their PDF links, from
// back when the backend handed out secure_url verbatim. Those links now go
// through the frontend's /files/ rewrite (see its next.config.ts) so readers
// only ever see the blog's own domain. This converts the rows already in the
// database; new links are built as /files/ paths at insert time.
//
// Only the "raw" delivery prefix is touched. Image URLs keep their Cloudinary
// host on purpose: they are rewritten with delivery transformations at render
// time (frontend/src/lib/article-images.ts), and the /files/ rewrite maps to
// raw/upload only, so an image moved behind it would 404.
const CLOUDINARY_RAW_PREFIX = "https://res.cloudinary.com/jsewsq7w/raw/upload/";
const PUBLIC_FILES_PREFIX = "/files/";

async function replaceInColumn(
  queryInterface: QueryInterface,
  column: "content" | "pdf_url",
  from: string,
  to: string,
  transaction: Transaction,
): Promise<void> {
  await queryInterface.sequelize.query(
    `
      UPDATE "posts"
      SET "${column}" = REPLACE("${column}", :from, :to)
      WHERE "${column}" LIKE :pattern
    `,
    { replacements: { from, to, pattern: `%${from}%` }, transaction },
  );
}

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // The Cloudinary prefix is an absolute URL, so it is unambiguous wherever
    // it appears and can be replaced as a plain substring in both columns.
    for (const column of ["content", "pdf_url"] as const) {
      await replaceInColumn(
        queryInterface,
        column,
        CLOUDINARY_RAW_PREFIX,
        PUBLIC_FILES_PREFIX,
        transaction,
      );
    }
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await replaceInColumn(
      queryInterface,
      "content",
      `href="${PUBLIC_FILES_PREFIX}`,
      `href="${CLOUDINARY_RAW_PREFIX}`,
      transaction,
    );

    // pdf_url holds one bare URL, so anchor at the start of the value itself.
    await queryInterface.sequelize.query(
      `
        UPDATE "posts"
        SET "pdf_url" = :prefix || SUBSTRING("pdf_url" FROM :offset)
        WHERE "pdf_url" LIKE :pattern
      `,
      {
        replacements: {
          prefix: CLOUDINARY_RAW_PREFIX,
          offset: PUBLIC_FILES_PREFIX.length + 1,
          pattern: `${PUBLIC_FILES_PREFIX}%`,
        },
        transaction,
      },
    );
  });
}
