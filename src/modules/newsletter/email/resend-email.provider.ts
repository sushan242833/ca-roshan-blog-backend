import { env } from "@config/env";
import { InternalServerError } from "@errors/http-error";
import {
  EmailProvider,
  SendEmailPayload,
} from "./email-provider.interface";

interface ResendErrorResponse {
  message?: string;
  name?: string;
}

function isResendErrorResponse(value: unknown): value is ResendErrorResponse {
  return typeof value === "object" && value !== null;
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => null)) as unknown;
    if (isResendErrorResponse(body) && typeof body.message === "string") {
      return body.message;
    }
  }

  const body = await response.text().catch(() => "");
  return body.slice(0, 500) || "Resend returned an error response.";
}

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string | undefined = env.RESEND_API_KEY,
    private readonly from: string = env.EMAIL_FROM,
  ) {}

  async sendEmail(payload: SendEmailPayload): Promise<void> {
    if (!this.apiKey) {
      throw new InternalServerError("Email provider is not configured.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new InternalServerError(`Failed to send email: ${message}`);
    }
  }
}

const resendEmailProvider = new ResendEmailProvider();

export default resendEmailProvider;
