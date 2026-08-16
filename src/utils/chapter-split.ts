import { slugify } from "@utils/index";

// One chapter of a post: a slice of the stored HTML starting at a top-level
// heading, plus a stable id derived from the heading text so chapter URLs stay
// the same across requests and deploys.
export interface RawChapter {
  id: string;
  title: string;
  order: number;
  html: string;
  /** One-line summary for chapter listings; null when there is no prose. */
  excerpt: string | null;
}

// Recognise both heading forms the editor may have produced: the current
// paragraph-with-class form (<p class="heading-2">) and legacy real tags
// (<h2>). Mirrors the frontend lib/toc.ts detection so the split lines up with
// what readers see as headings. Only levels 1-3 are considered chapter/section
// candidates; h4+ never starts a chapter.
const HEADING_RE = /<(h[1-3]|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const HEADING_CLASS_RE = /\bheading-([1-3])\b/;

function headingLevel(tag: string, attrs: string): number | null {
  if (/^h[1-3]$/i.test(tag)) {
    return Number(tag[1]);
  }
  const match = HEADING_CLASS_RE.exec(attrs);
  return match ? Number(match[1]) : null;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

// Decode the handful of entities Tiptap emits, for the human-readable title.
// &amp; last so "&amp;lt;" does not collapse into "<".
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function headingText(inner: string): string {
  return decodeEntities(stripTags(inner)).replace(/\s+/g, " ").trim();
}

// Chapter titles and ids are persisted — post_chapters.title is VARCHAR(512)
// and chapter_id is VARCHAR(255) — and a heading long enough to overflow either
// would fail the bulk insert inside the post-save transaction, rolling the whole
// create/update back as an unexplained 500. Clause-length headings are ordinary
// in legal and tax writing, so both are bounded HERE rather than at the database:
// the persisted split and the in-memory preview split have to agree on every
// value, and a cap applied only on write would make a draft preview differently
// than it publishes. Postgres counts VARCHAR limits in characters, so these are
// character counts too.
const MAX_TITLE_LENGTH = 500;
// Leaves ample room inside 255 for the "-1", "-2" uniqueness suffix appended
// below when two headings slugify to the same base.
const MAX_ID_BASE_LENGTH = 200;

// Trims back to a word boundary so a cut title does not end mid-word, and marks
// the cut with an ellipsis exactly as chapter excerpts do. Titles at or under
// the limit — which is every heading in ordinary content — pass through
// untouched, so existing chapter titles and the ids derived from them are
// unaffected.
function capTitle(title: string): string {
  if (title.length <= MAX_TITLE_LENGTH) {
    return title;
  }

  const cut = title.slice(0, MAX_TITLE_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > MAX_TITLE_LENGTH / 2 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}

// The id base for a title, bounded so the finished id (base + any suffix) always
// fits chapter_id. Cutting back to a hyphen keeps the id ending on a whole word,
// and any separator the cut leaves behind is stripped so no id ends in "-" or
// produces a doubled "--1" once a suffix is appended. Two long headings sharing
// a 200-character prefix collapse to the same base and are then separated by the
// suffix loop, exactly as two identical short headings already are.
function boundedIdBase(title: string): string {
  const slug = slugify(title, "chapter");
  if (slug.length <= MAX_ID_BASE_LENGTH) {
    return slug;
  }

  const cut = slug.slice(0, MAX_ID_BASE_LENGTH);
  const lastHyphen = cut.lastIndexOf("-");
  const trimmed = lastHyphen > MAX_ID_BASE_LENGTH / 2 ? cut.slice(0, lastHyphen) : cut;
  return trimmed.replace(/-+$/, "") || "chapter";
}

const EXCERPT_MAX_LENGTH = 140;

// Block boundaries have to become whitespace or adjacent blocks run together
// ("…Advisory BlogJune 20261. Current Status"). Inline tags are still dropped
// without a space, so a word split across <strong>/<em> stays whole.
const BLOCK_BOUNDARY_RE =
  /<\/(?:p|h[1-6]|li|tr|td|th|div|blockquote|figcaption)\s*>|<br\s*\/?>/gi;

function textForExcerpt(html: string): string {
  return decodeEntities(stripTags(html.replace(BLOCK_BOUNDARY_RE, " ")))
    .replace(/\s+/g, " ")
    .trim();
}

// A one-line summary for chapter listings, taken from the chapter's opening
// prose with the heading text removed (the heading is already shown as the
// title). Null when the chapter carries no prose at all — e.g. only a table or
// an image — so the UI can omit the line rather than print an empty one.
function chapterExcerpt(html: string, title: string): string | null {
  const text = textForExcerpt(html);
  const body = text.startsWith(title) ? text.slice(title.length).trim() : text;
  if (!body) {
    return null;
  }
  if (body.length <= EXCERPT_MAX_LENGTH) {
    return body;
  }

  // Trim back to a word boundary so the ellipsis never lands mid-word.
  const cut = body.slice(0, EXCERPT_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// True when a slice contains anything a reader would see (text or an image),
// so an empty run of whitespace/markup before the first heading is not turned
// into a hollow "Introduction" chapter.
function hasVisibleContent(html: string): boolean {
  const withoutTags = stripTags(html).replace(/\s|&nbsp;/g, "");
  return withoutTags.length > 0 || /<img\b/i.test(html);
}

interface HeadingMark {
  /** Offset of the heading's opening tag. */
  index: number;
  /** Offset just past the heading's closing tag. */
  end: number;
  level: number;
  text: string;
}

/**
 * Split stored post HTML into chapters at the shallowest heading level present
 * (so a post written with h2 chapters / h3 sections splits at the h2s, and one
 * written with h1/h2 splits at the h1s). Content before the first such heading
 * becomes an intro chapter. When the post has no headings at all it is returned
 * as a single chapter titled `fallbackTitle`.
 *
 * The HTML passed in is the raw stored content; it is sliced, not sanitised.
 * The frontend runs its usual sanitise -> buildToc -> image pipeline on each
 * chapter, exactly as it did on the whole document before.
 */
export function splitIntoChapters(
  content: string,
  fallbackTitle: string,
): RawChapter[] {
  const source = content ?? "";

  // Pass 1: locate every heading, its level, its start index, and its text.
  const headings: HeadingMark[] = [];
  let match: RegExpExecArray | null;
  HEADING_RE.lastIndex = 0;
  while ((match = HEADING_RE.exec(source)) !== null) {
    const level = headingLevel(match[1], match[2]);
    if (level === null) {
      continue; // an ordinary paragraph, not a heading
    }
    headings.push({
      index: match.index,
      end: match.index + match[0].length,
      level,
      text: headingText(match[3]),
    });
  }

  const usedIds = new Set<string>();
  const makeId = (title: string): string => {
    const base = boundedIdBase(title);
    let id = base;
    let suffix = 1;
    while (usedIds.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    return id;
  };

  // No headings: the whole post is one chapter. The fallback is the post title,
  // which the posts table already bounds at 255, but it is capped through the
  // same helper so every title in a split is produced one way.
  if (headings.length === 0) {
    const title = capTitle(fallbackTitle);
    return [
      {
        id: makeId(title),
        title,
        order: 0,
        html: source,
        excerpt: chapterExcerpt(source, title),
      },
    ];
  }

  const shallowest = headings.reduce(
    (min, h) => (h.level < min ? h.level : min),
    headings[0].level,
  );
  const boundaries = headings.filter((h) => h.level === shallowest);

  const chapters: RawChapter[] = [];
  let order = 0;

  // Intro: anything before the first chapter heading.
  const introHtml = source.slice(0, boundaries[0].index);
  if (hasVisibleContent(introHtml)) {
    chapters.push({
      id: makeId("Introduction"),
      title: "Introduction",
      order,
      html: introHtml,
      excerpt: chapterExcerpt(introHtml, "Introduction"),
    });
    order += 1;
  }

  // One chapter per boundary heading, up to the next boundary. The slice starts
  // AFTER the boundary heading: the chapter page already renders the chapter
  // title as its own <h1>, so keeping the heading in the body would print the
  // title twice and make the body's first table-of-contents entry the chapter
  // title rather than a section within it.
  boundaries.forEach((boundary, i) => {
    const sliceEnd =
      i + 1 < boundaries.length ? boundaries[i + 1].index : source.length;
    const title = capTitle(boundary.text) || `Chapter ${order + 1}`;
    const html = source.slice(boundary.end, sliceEnd);
    chapters.push({
      id: makeId(title),
      title,
      order,
      html,
      excerpt: chapterExcerpt(html, title),
    });
    order += 1;
  });

  return chapters;
}
