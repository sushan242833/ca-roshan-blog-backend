import { QueryInterface } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // A post is in the hero or in Featured Insights, never both (enforced by
    // the post service from here on). A post that is both today keeps the
    // hero, the admin's more specific choice, and leaves the featured slots.
    await queryInterface.sequelize.query(
      `
      UPDATE posts
      SET featured = false, featured_position = NULL
      WHERE show_in_hero = true AND featured = true
      `,
      { transaction },
    );
  });
}

// Which posts were un-featured is not recorded, so there is nothing to reverse.
export async function down() {}
