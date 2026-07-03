import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import CategoryService from "@services/category.service";
import { ConflictError, NotFoundError } from "@errors/http-error";
import {
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createCategory } from "../setup/test-helpers";

describe("CategoryService", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("creates a category with a generated slug", async () => {
    const category = await CategoryService.create({ name: "Tax Planning" });

    assert.equal(category.name, "Tax Planning");
    assert.equal(category.slug, "tax-planning");
  });

  it("rejects create when the slug already exists", async () => {
    await createCategory({ name: "Audit", slug: "audit" });

    await assert.rejects(
      () => CategoryService.create({ name: "Audit", slug: "audit" }),
      ConflictError,
    );
  });

  it("rejects update when the new slug collides with another category", async () => {
    await createCategory({ name: "Audit", slug: "audit" });
    const other = await createCategory({
      name: "Compliance",
      slug: "compliance",
    });

    await assert.rejects(
      () => CategoryService.update(other.id, { slug: "audit" }),
      ConflictError,
    );
  });

  it("throws NotFoundError when deleting a non existent category", async () => {
    await assert.rejects(
      () => CategoryService.delete(randomUUID()),
      NotFoundError,
    );
  });

  it("deletes an existing category", async () => {
    const category = await createCategory({
      name: "Bookkeeping",
      slug: "bookkeeping",
    });

    const result = await CategoryService.delete(category.id);

    assert.equal(result, true);
    await assert.rejects(
      () => CategoryService.update(category.id, { name: "x" }),
      NotFoundError,
    );
  });
});
