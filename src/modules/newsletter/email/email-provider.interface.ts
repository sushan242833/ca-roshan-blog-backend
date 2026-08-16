export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  unsubscribeUrl?: string;
}

export interface EmailProvider {
  sendEmail(payload: SendEmailPayload): Promise<void>;
}
