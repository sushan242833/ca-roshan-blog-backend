import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ResendEmailProvider } from "@modules/newsletter/email/resend-email.provider";
import { SendEmailPayload } from "@modules/newsletter/email/email-provider.interface";
import { buildPostNewsletterEmail } from "@modules/newsletter/email/newsletter-email.templates";

interface ResendRequestBody {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];

const originalFetch = globalThis.fetch;

/** Calls captured by the fetch stub, newest last. */
let calls: Array<{ url: string; body: ResendRequestBody }> = [];

function stubFetch(): void {
  calls = [];
  globalThis.fetch = (async (
    input: FetchInput,
    init?: FetchInit,
  ): Promise<Response> => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")) as ResendRequestBody,
    });
    return new Response(JSON.stringify({ id: "test-message-id" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
}

async function send(payload: SendEmailPayload): Promise<ResendRequestBody> {
  const provider = new ResendEmailProvider("test-api-key", "blog@example.test");
  await provider.sendEmail(payload);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  return calls[0].body;
}

const UNSUBSCRIBE_URL = "https://blog.example.test/unsubscribe?token=abc123";

describe("newsletter one-click List-Unsubscribe headers", () => {
  beforeEach(() => {
    stubFetch();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends RFC 8058 headers to Resend when an unsubscribe URL is present", async () => {
    const body = await send({
      to: "reader@example.test",
      subject: "A new post",
      html: "<p>A new post</p>",
      text: "A new post",
      unsubscribeUrl: UNSUBSCRIBE_URL,
    });

    assert.deepEqual(body.headers, {
      "List-Unsubscribe": `<${UNSUBSCRIBE_URL}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("omits the headers entirely when no unsubscribe URL is given", async () => {
    const body = await send({
      to: "someone@example.test",
      subject: "Contact form",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    assert.equal(body.headers, undefined);
    // The rest of the request shape is unchanged.
    assert.deepEqual(body.to, ["someone@example.test"]);
    assert.equal(body.subject, "Contact form");
  });

  it("threads the unsubscribe URL from the newsletter template through to the headers", async () => {
    const post = buildPostNewsletterEmail({
      email: "reader@example.test",
      postTitle: "Shipping one-click unsubscribe",
      postExcerpt: null,
      postUrl: "https://blog.example.test/posts/one-click",
      unsubscribeUrl: UNSUBSCRIBE_URL,
    });
    assert.equal(post.unsubscribeUrl, UNSUBSCRIBE_URL);

    const postBody = await send(post);
    assert.equal(
      postBody.headers?.["List-Unsubscribe"],
      `<${UNSUBSCRIBE_URL}>`,
    );
    assert.equal(
      postBody.headers?.["List-Unsubscribe-Post"],
      "List-Unsubscribe=One-Click",
    );
  });
});
