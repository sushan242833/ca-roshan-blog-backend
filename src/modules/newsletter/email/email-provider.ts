import { env } from "@config/env";
import consoleEmailProvider from "./console-email.provider";
import { EmailProvider } from "./email-provider.interface";
import resendEmailProvider from "./resend-email.provider";

/**
 * Selects which email provider to use.
 *
 * - Explicit override via EMAIL_PROVIDER ("console" | "resend").
 * - Otherwise Resend when an API key is configured, else the console provider
 *   so local / offline development keeps working without a network round-trip.
 */
export function createEmailProvider(): EmailProvider {
  const override = env.EMAIL_PROVIDER;

  if (override === "console") {
    return consoleEmailProvider;
  }

  if (override === "resend") {
    return resendEmailProvider;
  }

  return env.RESEND_API_KEY ? resendEmailProvider : consoleEmailProvider;
}

const emailProvider = createEmailProvider();

export default emailProvider;
