export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  sendEmail(payload: SendEmailPayload): Promise<void>;
}
