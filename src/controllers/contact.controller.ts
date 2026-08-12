import { Request, Response, NextFunction } from "express";
import { env } from "@config/env";
import { EmptyRequestParams } from "@app-types/http.requests";
import emailProvider from "@modules/newsletter/email/email-provider";
import { escapeHtml } from "@modules/newsletter/email/newsletter-email.templates";

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

    // Every field is attacker-controlled and lands in an HTML email read by the
    // site owner, so each one is escaped before interpolation. The subject
    // additionally has CR/LF collapsed so it cannot forge extra mail headers.
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
    const safeSubject = (subject?.trim() || `New message from ${name}`).replace(
      /[\r\n]+/g,
      " ",
    );

    await emailProvider.sendEmail({
      to: env.CONTACT_EMAIL,
      replyTo: safeEmail,
      subject: `[Contact Form] ${safeSubject}`,
      html:
        `<p><strong>Name:</strong> ${safeName}</p>` +
        `<p><strong>Email:</strong> ${safeEmail}</p>` +
        `<p><strong>Message:</strong></p><p>${safeMessage}</p>`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export default { submitContactForm };
