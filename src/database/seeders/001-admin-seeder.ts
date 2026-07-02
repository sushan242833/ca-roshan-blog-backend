import authService from "@services/auth.service";
import { ConflictError } from "@errors/http-error";
import { env } from "@config/env";

export async function seed(): Promise<void> {
  const email = env.ADMIN_EMAIL ?? "admin@caroshan.com";
  const password = env.ADMIN_PASSWORD ?? "ChangeThisPassword123!";
  const name = env.ADMIN_NAME ?? "CA Roshan";

  try {
    await authService.createAdmin({ name, email, password });
    console.log(`Admin account created: ${email}`);
    console.log(
      "IMPORTANT: Change the default password immediately after first login.",
    );
  } catch (err) {
    if (err instanceof ConflictError) {
      console.log("Admin account already exists — skipping seed.");
      return;
    }
    throw err;
  }
}
