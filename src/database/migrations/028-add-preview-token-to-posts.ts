import { QueryInterface } from "sequelize";
import { ensureColumn, ensureIndex } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // Preview links used to be JWTs signed with JWT_SECRET — the same key that
    // signs admin access tokens. These two columns replace that with an opaque
    // random token whose digest lives on the row, so a preview link is checked
    // by lookup instead of by signature and can be revoked before it expires.
    //
    // The digest, not the token: a database dump or a read-only injection then
    // yields nothing that opens an unpublished draft.
    await ensureColumn(
      queryInterface,
      "posts",
      "preview_token_hash",
      { type: "VARCHAR(64)", allowNull: true },
      { transaction },
    );

    await ensureColumn(
      queryInterface,
      "posts",
      "preview_token_expires_at",
      { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
      { transaction },
    );

    // Unique so the lookup can never be ambiguous, and indexed because the
    // digest is the only thing a preview request has to search by. Postgres
    // permits many NULLs under a unique index, so posts without a live preview
    // link are unaffected.
    await ensureIndex(queryInterface, "posts", ["preview_token_hash"], {
      name: "posts_preview_token_hash_unique",
      unique: true,
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    try {
      await queryInterface.removeIndex(
        "posts",
        "posts_preview_token_hash_unique",
        { transaction },
      );
    } catch {
      // already removed — safe to continue
    }

    await queryInterface
      .removeColumn("posts", "preview_token_hash", { transaction })
      .catch(() => {});
    await queryInterface
      .removeColumn("posts", "preview_token_expires_at", { transaction })
      .catch(() => {});
  });
}
