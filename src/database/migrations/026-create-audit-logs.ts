import { DataTypes, QueryInterface } from "sequelize";
import { ensureIndex, ensureTable } from "@database/utils/migration-utils";

// Append-only trail for authentication and destructive actions. Rows record
// who did what, from where, and whether it worked — never the credential,
// token, or token hash involved (see src/utils/audit.ts).
//
// actor_id is deliberately nullable and carries no foreign key to admins: a
// failed login has no known actor, and the trail must outlive the row it
// points at rather than cascade away with it.
export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await ensureTable(
      queryInterface,
      "audit_logs",
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
        },
        action: { type: DataTypes.STRING(64), allowNull: false },
        actor_id: { type: DataTypes.UUID, allowNull: true },
        target_type: { type: DataTypes.STRING(64), allowNull: true },
        target_id: { type: DataTypes.STRING(64), allowNull: true },
        ip: { type: DataTypes.STRING(64), allowNull: true },
        user_agent: { type: DataTypes.STRING(255), allowNull: true },
        outcome: { type: DataTypes.STRING(16), allowNull: false },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: queryInterface.sequelize.fn("NOW"),
        },
      },
      { transaction },
    );

    // Every read of this table is time-ordered ("what happened recently"), so
    // created_at is the one index that earns its keep.
    await ensureIndex(queryInterface, "audit_logs", ["created_at"], {
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable("audit_logs", { transaction });
  });
}
