import { Request, Response, NextFunction } from "express";
import { env } from "@config/env";
import { EmptyRequestParams } from "@app-types/http.requests";
import resendEmailProvider from "@modules/newsletter/email/resend-email.provider";

interface ContactFormBody {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export async function submitContactForm(
  req: Request<EmptyRequestParams, unknown, ContactFormBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, email, subject, message } = req.body;
    const emailSubject = subject?.trim() || `New message from ${name}`;
    const safeMessage = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

    await resendEmailProvider.sendEmail({
      to: env.CONTACT_EMAIL,
      subject: `[Contact Form] ${emailSubject}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${safeMessage}</p>`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export default { submitContactForm };
