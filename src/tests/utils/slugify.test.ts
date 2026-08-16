import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "@utils/index";

// Regression cover for P1-2. The previous algorithm was
//   .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
// which erased every non-ASCII script: a Devanagari title produced "", and the
// caller then built the URLs /blogs/ and /blogs/-2.
describe("slugify", () => {
  it("slugifies plain English", () => {
    assert.equal(slugify("Hello World"), "hello-world");
  });

  it("preserves Devanagari rather than erasing it", () => {
    const slug = slugify("नेपाली कर कानून");
    assert.equal(slug, "नेपाली-कर-कानून");
    assert.notEqual(slug, "");
  });

  it("keeps the combining vowel signs that carry Devanagari meaning", () => {
    // The matras (े ा ी) are Unicode Mark, not Letter. A \p{L}-only filter
    // would silently reduce this to "नपल" — a different word.
    assert.equal(slugify("नेपाली"), "नेपाली");
    assert.ok(slugify("नेपाली").length > 3);
  });

  it("handles mixed Nepali and English", () => {
    assert.equal(slugify("नेपाल Tax Law"), "नेपाल-tax-law");
    assert.equal(slugify("नेपाली English मिश्रित"), "नेपाली-english-मिश्रित");
  });

  it("falls back rather than returning an empty slug for punctuation only", () => {
    assert.equal(slugify("!!!@@@"), "post");
    assert.equal(slugify("   "), "post");
    assert.equal(slugify(""), "post");
    assert.equal(slugify("---"), "post");
  });

  it("honours a caller-supplied fallback", () => {
    assert.equal(slugify("!!!", "chapter"), "chapter");
    assert.equal(slugify("!!!", "category"), "category");
  });

  it("keeps digit-only titles intact", () => {
    assert.equal(slugify("123"), "123");
  });

  it("collapses punctuation runs into a single separator", () => {
    assert.equal(slugify("Tax --- Law!!! 2026"), "tax-law-2026");
    assert.equal(slugify("  Leading & trailing  "), "leading-trailing");
  });

  it("strips invisible zero-width characters instead of splitting on them", () => {
    // ZWNJ inside a word must not become a hyphen, or two visually identical
    // titles produce two different URLs.
    assert.equal(slugify("क‌ष"), "कष");
    assert.equal(slugify("tax​law"), "taxlaw");
  });

  it("normalises equivalent Unicode compositions to one slug", () => {
    // Precomposed é vs e + combining acute.
    assert.equal(slugify("café"), slugify("café"));
  });

  it("never returns a slug that is empty or edged with separators", () => {
    const inputs = [
      "Hello World",
      "नेपाली कर कानून",
      "नेपाल Tax Law",
      "!!!@@@",
      "123",
      "-leading",
      "trailing-",
      "…",
      "©®™",
    ];

    for (const input of inputs) {
      const slug = slugify(input);
      assert.notEqual(slug, "", `"${input}" produced an empty slug`);
      assert.ok(!slug.startsWith("-"), `"${input}" -> "${slug}" starts with -`);
      assert.ok(!slug.endsWith("-"), `"${input}" -> "${slug}" ends with -`);
    }
  });

  it("bounds the slug so it fits the VARCHAR(255) column with room for a suffix", () => {
    const slug = slugify("क".repeat(400));
    assert.ok(slug.length <= 200, `slug was ${slug.length} characters`);
    assert.ok(!slug.endsWith("-"));
  });
});
