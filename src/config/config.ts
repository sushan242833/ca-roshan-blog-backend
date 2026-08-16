import { Sequelize } from "sequelize-typescript";
import { env } from "./env";

// Managed Postgres providers (Neon, Supabase, Render, RDS) hand out a single
// connection URL and refuse plaintext connections. When DATABASE_URL is present
// it wins over the discrete DB_* variables, so the same build runs locally and
// in production with only an env change.
//
// IMPORTANT: node-postgres parses `sslmode` out of the connection string and,
// when present, that setting takes precedence over `dialectOptions.ssl` —
// silently ignoring the options below, including DB_SSL_CA. Providers hand you
// URLs ending in `?sslmode=require`, so we strip the parameter and drive TLS
// entirely from here. Behaviour is then identical no matter what was pasted in.
function stripSslParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    return parsed.toString();
  } catch {
    // Not a parseable URL. Hand it to Sequelize unchanged and let it complain
    // with a clearer message than anything we would invent here.
    return url;
  }
}

// The server certificate is verified by default — encryption without
// verification does not stop an active interceptor. DB_SSL_CA supplies the
// provider's CA when it is not in the system trust store. DB_SSL_VERIFY=false
// can waive verification only outside production/staging (e.g. a local Postgres
// with a self-signed certificate); prod-like environments always verify.
const isProdLike =
  env.NODE_ENV === "production" || env.NODE_ENV === "staging";

const sslOptions = env.DB_SSL
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: isProdLike ? true : env.DB_SSL_VERIFY !== false,
        ...(env.DB_SSL_CA ? { ca: env.DB_SSL_CA } : {}),
      },
    }
  : {};

const poolOptions = {
  // Free-tier Postgres caps total connections low. Keep this small so a restart
  // storm cannot exhaust the server's slots.
  max: env.DB_POOL_MAX,
  min: 0,
  acquire: 30000,
  idle: 10000,
};

const logging = env.NODE_ENV === "development" ? console.log : false;

const sequelize = env.DATABASE_URL
  ? new Sequelize(stripSslParams(env.DATABASE_URL), {
      dialect: "postgres",
      logging,
      pool: poolOptions,
      dialectOptions: sslOptions,
    })
  : new Sequelize({
      database: env.DB_NAME,
      username: env.DB_USER,
      password: env.DB_PASSWORD,
      host: env.DB_HOST,
      port: env.DB_PORT,
      dialect: "postgres",
      logging,
      pool: poolOptions,
      dialectOptions: sslOptions,
    });

export default sequelize;
