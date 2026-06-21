import { QueryInterface } from "sequelize";
import { ensureColumn, ensureIndex } from "@database/utils/migration-utils";

export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `
        DO $$
        BEGIN
          CREATE TYPE "enum_subscribers_status" AS ENUM (
            'PENDING',
            'ACTIVE',
            'UNSUBSCRIBED'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;

        DO $$
        BEGIN
          CREATE TYPE "enum_newsletter_logs_status" AS ENUM (
            'PENDING',
            'SENT',
            'FAILED'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `,
      { transaction },
    );

    await ensureColumn(
      queryInterface,
      "subscribers",
      "status",
      { type: "VARCHAR(32)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "subscribers",
      "verification_token",
      { type: "VARCHAR(255)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "subscribers",
      "unsubscribe_token",
      { type: "VARCHAR(255)", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "subscribers",
      "verified_at",
      { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
      { transaction },
    );
    await ensureColumn(
      queryInterface,
      "subscribers",
      "deleted_at",
      { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
      { transaction },
    );

    await queryInterface.sequelize.query(
      `
        DO $$
        DECLARE
          has_verified boolean;
          has_subscribed_at boolean;
        BEGIN
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'subscribers'
              AND column_name = 'verified'
          ) INTO has_verified;

          SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'subscribers'
              AND column_name = 'subscribed_at'
          ) INTO has_subscribed_at;

          IF has_verified THEN
            EXECUTE '
              UPDATE subscribers
              SET status = CASE
                WHEN status::text IN (''PENDING'', ''ACTIVE'', ''UNSUBSCRIBED'')
                  THEN status::text
                WHEN COALESCE(verified, false)
                  THEN ''ACTIVE''
                ELSE ''PENDING''
              END
            ';
          ELSE
            EXECUTE '
              UPDATE subscribers
              SET status = CASE
                WHEN status::text IN (''PENDING'', ''ACTIVE'', ''UNSUBSCRIBED'')
                  THEN status::text
                ELSE ''PENDING''
              END
            ';
          END IF;

          IF has_subscribed_at THEN
            EXECUTE '
              UPDATE subscribers
              SET verified_at = COALESCE(verified_at, subscribed_at, updated_at)
              WHERE status::text = ''ACTIVE''
                AND verified_at IS NULL
            ';
          ELSE
            EXECUTE '
              UPDATE subscribers
              SET verified_at = COALESCE(verified_at, updated_at)
              WHERE status::text = ''ACTIVE''
                AND verified_at IS NULL
            ';
          END IF;
        END $$;

        UPDATE subscribers
        SET unsubscribe_token = replace(
          gen_random_uuid()::text || gen_random_uuid()::text,
          '-',
          ''
        )
        WHERE unsubscribe_token IS NULL;

        ALTER TABLE subscribers
          ALTER COLUMN status TYPE "enum_subscribers_status"
            USING status::text::"enum_subscribers_status",
          ALTER COLUMN status SET DEFAULT 'PENDING',
          ALTER COLUMN status SET NOT NULL,
          ALTER COLUMN unsubscribe_token SET NOT NULL;
      `,
      { transaction },
    );

    await ensureIndex(queryInterface, "subscribers", ["status"], {
      name: "subscribers_status",
      transaction,
    });
    await ensureIndex(queryInterface, "subscribers", ["verification_token"], {
      name: "subscribers_verification_token_key",
      unique: true,
      transaction,
    });
    await ensureIndex(queryInterface, "subscribers", ["unsubscribe_token"], {
      name: "subscribers_unsubscribe_token_key",
      unique: true,
      transaction,
    });

    await ensureColumn(
      queryInterface,
      "newsletter_logs",
      "error_message",
      { type: "TEXT", allowNull: true },
      { transaction },
    );

    await queryInterface.sequelize.query(
      `
        UPDATE newsletter_logs
        SET status = 'PENDING'
        WHERE status::text NOT IN ('PENDING', 'SENT', 'FAILED')
          OR status IS NULL;

        ALTER TABLE newsletter_logs
          ALTER COLUMN status TYPE "enum_newsletter_logs_status"
            USING status::text::"enum_newsletter_logs_status",
          ALTER COLUMN status SET DEFAULT 'PENDING',
          ALTER COLUMN status SET NOT NULL;
      `,
      { transaction },
    );

    await ensureIndex(queryInterface, "newsletter_logs", ["post_id", "subscriber_id"], {
      name: "newsletter_logs_post_subscriber",
      transaction,
    });
  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface
      .removeIndex("newsletter_logs", "newsletter_logs_post_subscriber", {
        transaction,
      })
      .catch(() => {});
    await queryInterface
      .removeColumn("newsletter_logs", "error_message", { transaction })
      .catch(() => {});
    await queryInterface
      .removeIndex("subscribers", "subscribers_status", { transaction })
      .catch(() => {});
    await queryInterface
      .removeIndex("subscribers", "subscribers_verification_token_key", {
        transaction,
      })
      .catch(() => {});
    await queryInterface
      .removeIndex("subscribers", "subscribers_unsubscribe_token_key", {
        transaction,
      })
      .catch(() => {});
    await queryInterface
      .removeColumn("subscribers", "deleted_at", { transaction })
      .catch(() => {});
  });
}
