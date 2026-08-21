import sanitizeHtml from "sanitize-html";

// Write-time sanitiser for article HTML, so what lands in the database is
// already clean rather than relying on the render pass alone. This is the
// backend mirror of frontend/src/lib/sanitize-html.ts — the two must agree, or
// content the editor legitimately emits gets stripped on save and silently
// disappears from published posts. Keep them in sync when either changes.
//
// The frontend copy stays in place as a second layer: it is the only thing
// protecting rows that were stored before this existed.
//
// The allowlist tracks what the TipTap editor can emit
// (frontend/src/components/admin/rich-text-editor.tsx) rather than
// sanitize-html's much narrower default.
const ALLOWED_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "s",
  "del",
  "strike",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "hr",
  "br",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "div",
  "span",
  "mark",
];

// Mirrors TEXT_PINK in frontend/src/lib/editor-palette.ts. Duplicated rather
// than shared because the two projects have no common module.
const TEXT_PINK = "#C00080";

// Mirrors the rule in src/validation/post.validation.ts (and the frontend's
// src/lib/pdf-url.ts): a full-content PDF link is either an absolute http(s)
// URL or a relative /files/ or /uploads/ path — the first being a Cloudinary
// raw asset proxied through the site's own domain, the second a self-hosted
// upload. Anything else — javascript:, data:, other schemes, arbitrary text —
// is rejected so the value is always a safe href.
function isValidPdfUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("/files/") || trimmed.startsWith("/uploads/")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Colour values the editor can produce: hex, as configured in the palette, and
// numeric rgb()/rgba(), which is what browser HTML serialisation normalises
// inline styles to. Closed shapes, so url(), var(), expression() and every
// other CSS payload fail them.
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const RGB_CHANNEL = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const RGB_ALPHA = "(?:0(?:\\.\\d+)?|1(?:\\.0+)?)";
const RGB_COLOR = new RegExp(
  `^(?:rgb\\(\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_CHANNEL}\\s*\\)|rgba\\(\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_ALPHA}\\s*\\))$`,
  "i",
);
const COLOR_VALUES = [HEX_COLOR, RGB_COLOR];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    // class carries the Callout node (`callout callout-*`), the pdf-link-block
    // chip and TextAlign's `text-align-*`; style is clamped by allowedStyles.
    "*": ["class", "style"],
    a: ["href", "target", "rel", "data-pdf-label"],
    img: ["src", "alt", "width", "height"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    div: ["data-callout", "data-variant"],
  },
  // Clamped to a closed set of properties AND values, so no styling beyond what
  // the editor's alignment and colour controls emit survives.
  allowedStyles: {
    "*": {
      "text-align": [/^(?:left|right|center|justify)$/],
      color: COLOR_VALUES,
    },
  },
  transformTags: {
    a: (tagName, attribs) => {
      // A link that opens a new tab must not leak the opener window.
      if (attribs.target === "_blank") {
        attribs.rel = "noopener noreferrer";
      }

      // The PDF chip is the one anchor we render as an authored block, so clamp
      // its href to the schemes the backend allows — anything else leaves a chip
      // with no href rather than a bad link. Other anchors fall back to
      // sanitize-html's default schemes, which reject javascript: and data:.
      const classes = (attribs.class ?? "").split(/\s+/);
      const href = attribs.href;
      if (
        classes.includes("pdf-link-block") &&
        (!href || !isValidPdfUrl(href))
      ) {
        delete attribs.href;
      }

      return { tagName, attribs };
    },

    mark: () => {
      return { tagName: "span", attribs: { style: `color: ${TEXT_PINK}` } };
    },
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export default sanitizeArticleHtml;
