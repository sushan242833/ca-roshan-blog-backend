import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import TagService from "@services/tag.service";
import { ConflictError, NotFoundError } from "@errors/http-error";
import {
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createTag } from "../setup/test-helpers";

describe("TagService", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("creates a tag with a generated slug", async () => {
    const tag = await TagService.create({ name: "Tax Planning" });

    assert.equal(tag.name, "Tax Planning");
    assert.equal(tag.slug, "tax-planning");
  });

  it("rejects create when the slug already exists", async () => {
    await createTag({ name: "Audit", slug: "audit" });

    await assert.rejects(
      () => TagService.create({ name: "Audit", slug: "audit" }),
      ConflictError,
    );
  });

  it("rejects update when the new slug collides with another tag", async () => {
    await createTag({ name: "Audit", slug: "audit" });
    const other = await createTag({ name: "Compliance", slug: "compliance" });

    await assert.rejects(
      () => TagService.update(other.id, { slug: "audit" }),
      ConflictError,
    );
  });

  it("throws NotFoundError when deleting a non existent tag", async () => {
    await assert.rejects(
      () => TagService.delete(randomUUID()),
      NotFoundError,
    );
  });

  it("deletes an existing tag", async () => {
    const tag = await createTag({ name: "Bookkeeping", slug: "bookkeeping" });

    const result = await TagService.delete(tag.id);

    assert.equal(result, true);
    await assert.rejects(
      () => TagService.update(tag.id, { name: "x" }),
      NotFoundError,
    );
  });
});
