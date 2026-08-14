import authService from "@services/auth.service";
import { ConflictError } from "@errors/http-error";
import { env } from "@config/env";

// Both values ship in .env.example, so they are known to anyone who has seen
// the repository. Treated as absent rather than as credentials.
const EXAMPLE_ADMIN_EMAIL = "admin@caroshan.com";
const EXAMPLE_ADMIN_PASSWORD = "ChangeThisPassword123!";

// The name is a byline, not a credential, so it keeps its fallback.
const DEFAULT_ADMIN_NAME = "CA Roshan";

interface AdminCredentials {
  email: string;
  password: string;
  name: string;
}

function resolveCredentials(): AdminCredentials {
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  const name = env.ADMIN_NAME ?? DEFAULT_ADMIN_NAME;

  if (env.NODE_ENV === "development") {
    return {
      email: email ?? EXAMPLE_ADMIN_EMAIL,
      password: password ?? EXAMPLE_ADMIN_PASSWORD,
      name,
    };
  }

  const problems: string[] = [];

  if (!email) {
    problems.push("ADMIN_EMAIL is not set");
  } else if (email.toLowerCase() === EXAMPLE_ADMIN_EMAIL) {
    problems.push("ADMIN_EMAIL is still the .env.example placeholder");
  }

  if (!password) {
    problems.push("ADMIN_PASSWORD is not set");
  } else if (password === EXAMPLE_ADMIN_PASSWORD) {
    problems.push("ADMIN_PASSWORD is still the .env.example placeholder");
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to seed the admin account with NODE_ENV=${env.NODE_ENV}: ` +
        `${problems.join("; ")}. Set ADMIN_EMAIL and ADMIN_PASSWORD to real ` +
        "values before seeding — the .env.example defaults are public.",
    );
  }

  return { email: email as string, password: password as string, name };
}

export async function seed(): Promise<void> {
  const { email, password, name } = resolveCredentials();

  try {
    await authService.createAdmin({ name, email, password });
    console.log(`Admin account created: ${email}`);
    if (env.NODE_ENV === "development") {
      console.log(
        "IMPORTANT: Change the default password immediately after first login.",
      );
    }
  } catch (err) {
    if (err instanceof ConflictError) {
      console.log("Admin account already exists — skipping seed.");
      return;
    }
    throw err;
  }
}
