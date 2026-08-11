import "reflect-metadata";
import sequelize from "@config/config";
import { Post, registerModels } from "@models/index";
import { regeneratePostChapters } from "@services/post-chapter.service";

// One post at a time: the whole point of the chapter table is to avoid holding
// a multi-MB body in memory, so the ids are listed first and each body is
// loaded, split and released inside its own transaction. Re-running is safe —
// regeneratePostChapters deletes a post's chapters before reinserting them.
async function backfillChapters(): Promise<number> {
  registerModels(sequelize);

  try {
    await sequelize.authenticate();
    console.log("Database connected");

    // Drafts and archived posts are included: their split has to exist before
    // they are published, not after. Soft-deleted posts are skipped (paranoid
    // default) — they are unreachable, and restoring one goes through an
    // update that regenerates its chapters anyway.
    const posts = await Post.findAll({
      attributes: ["id"],
      order: [["createdAt", "ASC"]],
    });
    console.log(`Backfilling chapters for ${posts.length} post(s)`);

    let paginatedCount = 0;

    for (const { id } of posts) {
      const result = await sequelize.transaction(async (transaction) => {
        const post = await Post.findByPk(id, {
          attributes: ["id", "title", "content"],
          transaction,
        });

        if (!post) {
          return null;
        }

        return regeneratePostChapters(post, transaction);
      });

      if (!result) {
        console.log(`Skipped ${id} — post disappeared mid-backfill`);
        continue;
      }

      if (result.paginated) {
        paginatedCount += 1;
        console.log(`Split ${id} into ${result.chapterCount} chapters`);
      }
    }

    console.log(
      `Chapter backfill completed: ${paginatedCount} paginated, ` +
        `${posts.length - paginatedCount} left inline`,
    );
    return 0;
  } catch (error) {
    console.error("Chapter backfill failed", error);
    return 1;
  } finally {
    await sequelize.close().catch((closeError: unknown) => {
      console.error("Failed to close database connection cleanly", closeError);
    });
  }
}

void backfillChapters().then((exitCode) => {
  process.exit(exitCode);
});
