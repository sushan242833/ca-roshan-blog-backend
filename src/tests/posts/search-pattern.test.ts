import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { QueryTypes } from "sequelize";
import sequelize from "@config/config";
import {
  buildExactWordPattern,
  buildPhrasePattern,
  buildPrefixPattern,
  escapeRegex,
  normalizeSearchTokens,
} from "@repositories/post.repository";
import { closeTestDatabase, setupTestDatabase } from "../setup/test-db";

// Pure unit tests on the pattern builders. These assert the exact generated
// strings so the word-boundary anchoring cannot silently regress — most
// importantly, that the WHERE-clause prefix pattern never gains a trailing \M
// or $ (which broke incremental typing: "test1" would stop matching "test10").
describe("search pattern builders", () => {
  it("escapeRegex escapes ERE metacharacters", () => {
    assert.equal(escapeRegex("a.b+c*"), "a\\.b\\+c\\*");
    assert.equal(escapeRegex("c(x)[y]{z}"), "c\\(x\\)\\[y\\]\\{z\\}");
    assert.equal(escapeRegex("a|b^c$"), "a\\|b\\^c\\$");
    assert.equal(escapeRegex("plain"), "plain");
  });

  it("buildPrefixPattern anchors the START only — no \\M, no $", () => {
    assert.equal(buildPrefixPattern("test"), "\\mtest");
    assert.equal(buildPrefixPattern("test1"), "\\mtest1");
    const pattern = buildPrefixPattern("test");
    assert.ok(!pattern.includes("\\M"), "prefix pattern must not contain \\M");
    assert.ok(!pattern.endsWith("$"), "prefix pattern must not end with $");
    assert.ok(!pattern.includes("\\y"), "prefix pattern must not use \\y");
  });

  it("buildExactWordPattern anchors BOTH ends (\\m … \\M)", () => {
    assert.equal(buildExactWordPattern("test"), "\\mtest\\M");
  });

  it("buildPhrasePattern anchors the phrase, joining words with \\s+", () => {
    assert.equal(buildPhrasePattern("income tax"), "\\mincome\\s+tax\\M");
    assert.equal(buildPhrasePattern("test"), "\\mtest\\M");
  });

  it("normalizeSearchTokens applies the caps and minimum", () => {
    assert.equal(normalizeSearchTokens("a"), null); // below 2-char minimum
    assert.equal(normalizeSearchTokens("   "), null);
    assert.deepEqual(normalizeSearchTokens("  hello   world  "), ["hello", "world"]);
    const capped = normalizeSearchTokens("aa bb cc dd ee ff gg hh");
    assert.ok(capped);
    assert.equal(capped.length, 6); // 6-token cap
  });
});

// Verify the generated patterns against the real PostgreSQL regex engine, since
// \m / \M are Postgres word-boundary operators (not JS regex). The pattern is
// passed as a bind parameter so its exact bytes are exercised.
describe("prefix pattern semantics (postgres ~*)", () => {
  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await closeTestDatabase();
  });

  async function matches(sample: string, pattern: string): Promise<boolean> {
    const [row] = await sequelize.query<{ m: boolean }>(
      "SELECT (:sample ~* :pattern) AS m",
      { replacements: { sample, pattern }, type: QueryTypes.SELECT },
    );
    return row?.m === true;
  }

  it("\\mtest matches words starting with 'test', case-insensitively", async () => {
    const pattern = buildPrefixPattern("test");
    for (const sample of ["test", "Test", "test10", "testing", "tests"]) {
      assert.ok(await matches(sample, pattern), `${sample} should match ${pattern}`);
    }
  });

  it("\\mtest does NOT match infixes or unrelated words", async () => {
    const pattern = buildPrefixPattern("test");
    for (const sample of ["latest", "contest", "greatest"]) {
      assert.ok(
        !(await matches(sample, pattern)),
        `${sample} should NOT match ${pattern}`,
      );
    }
  });

  it("\\mtest1 matches only longer words carrying that prefix", async () => {
    const pattern = buildPrefixPattern("test1");
    assert.ok(await matches("test10", pattern));
    assert.ok(await matches("test123", pattern));
    assert.ok(!(await matches("test", pattern)));
  });

  it("the exact-word pattern matches only the whole word", async () => {
    const pattern = buildExactWordPattern("test");
    assert.ok(await matches("test", pattern));
    assert.ok(await matches("Test", pattern));
    assert.ok(!(await matches("test10", pattern)), "test10 is not the whole word 'test'");
  });
});
