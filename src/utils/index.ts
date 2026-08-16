const MAX_SLUG_LENGTH = 200;

const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;

const NON_SLUG_CHAR_RE = /[^\p{L}\p{N}\p{M}]+/gu;

export function slugify(input: string, fallback = "post"): string {
  const slug = input
    .toString()
    .normalize("NFC")
    .replace(ZERO_WIDTH_RE, "")
    .trim()
    .toLowerCase()
    .replace(NON_SLUG_CHAR_RE, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // The slice can leave a trailing separator behind.
    .replace(/-+$/g, "");

  return slug || fallback;
}
