import { EmailProvider, SendEmailPayload } from "./email-provider.interface";

/**
 * Development / offline email provider.
 *
 * Instead of hitting an external service (Resend), it logs the outgoing email
 * to the console. This lets the newsletter and contact flows work in
 * environments without internet access, and makes unsubscribe links easy to
 * grab from the server logs.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(payload: SendEmailPayload): Promise<void> {
    // eslint-disable-next-line no-console
    console.info(
      [
        "",
        "──────────────────────────────────────────────",
        "📧  Email (console provider — not actually sent)",
        `To:      ${payload.to}`,
        `Subject: ${payload.subject}`,
        ...(payload.unsubscribeUrl
          ? [
              `List-Unsubscribe: <${payload.unsubscribeUrl}>`,
              "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
            ]
          : []),
        "",
        payload.text,
        "──────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  }
}

const consoleEmailProvider = new ConsoleEmailProvider();

export default consoleEmailProvider;
