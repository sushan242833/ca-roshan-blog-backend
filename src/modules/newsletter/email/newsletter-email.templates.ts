import { SendEmailPayload } from "./email-provider.interface";

export interface PostNewsletterTemplateData {
  email: string;
  postTitle: string;
  postExcerpt: string | null;
  postUrl: string;
  unsubscribeUrl: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseLayout(
  title: string,
  body: string,
  unsubscribeUrl: string,
): string {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;background:#f6f7f9;color:#111827;font-family:Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
                <tr>
                  <td style="padding:32px;">
                    ${body}
                    <hr style="border:0;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
                    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
                      You are receiving this because ${escapeHtml("you subscribed to Roshan Blog")}.
                      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#374151;">Unsubscribe</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function button(label: string, href: string): string {
  return `
    <p style="margin:24px 0;">
      <a href="${escapeHtml(href)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:700;">
        ${escapeHtml(label)}
      </a>
    </p>
  `;
}

export function buildPostNewsletterEmail(
  data: PostNewsletterTemplateData,
): SendEmailPayload {
  const excerpt = data.postExcerpt
    ? `<p style="font-size:16px;line-height:1.7;margin:0 0 16px;color:#374151;">${escapeHtml(data.postExcerpt)}</p>`
    : "";
  const html = baseLayout(
    data.postTitle,
    `
      <p style="font-size:13px;font-weight:700;letter-spacing:0;text-transform:uppercase;color:#6b7280;margin:0 0 10px;">New post</p>
      <h1 style="font-size:26px;line-height:1.25;margin:0 0 14px;">${escapeHtml(data.postTitle)}</h1>
      ${excerpt}
      ${button("Read the post", data.postUrl)}
    `,
    data.unsubscribeUrl,
  );

  return {
    to: data.email,
    subject: data.postTitle,
    html,
    unsubscribeUrl: data.unsubscribeUrl,
    text: [
      data.postTitle,
      "",
      data.postExcerpt ?? "",
      "",
      `Read the post: ${data.postUrl}`,
      "",
      `Unsubscribe: ${data.unsubscribeUrl}`,
    ].join("\n"),
  };
}
