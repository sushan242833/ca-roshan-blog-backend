import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { Post } from "@models/index";
import { PostStatus } from "@models/post.model";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import { createAdmin, createPost, loginAdmin } from "../setup/test-helpers";

const ENDPOINT = "/api/v1/admin/featured-posts";

interface SlotsResponseBody {
  success: boolean;
  data: {
    slots: {
      position: number;
      post: { id: string; featured: boolean; featuredPosition: number | null } | null;
    }[];
  };
}

interface ErrorResponseBody {
  success: boolean;
  error: { code: string; details?: { field: string; message: string }[] };
}

interface FeaturedListResponseBody {
  success: boolean;
  data: {
    items: { id: string; featuredPosition: number | null }[];
  };
}

interface Context {
  adminId: string;
  token: string;
}

async function setup(): Promise<Context> {
  const admin = await createAdmin();
  const login = await loginAdmin(admin);
  return { adminId: admin.admin.id, token: login.accessToken };
}

function publishedPost(adminId: string, title = "Featured probe"): Promise<Post> {
  return createPost({ adminId, title, status: PostStatus.PUBLISHED });
}

function putSlots(token: string, slots: unknown) {
  return createTestRequest()
    .put(ENDPOINT)
    .set("Authorization", `Bearer ${token}`)
    .send({ slots });
}

async function expectValidationError(token: string, slots: unknown) {
  const response = await putSlots(token, slots).expect(400);
  const body = response.body as ErrorResponseBody;
  assert.equal(body.success, false);
  assert.equal(body.error.code, "VALIDATION_ERROR");
  return body;
}

async function positionOf(post: Post): Promise<number | null> {
  await post.reload({ paranoid: false });
  return post.featuredPosition ?? null;
}

async function fillAllSlots(context: Context): Promise<void> {
  const slots = [];
  for (let position = 1; position <= 6; position += 1) {
    const post = await publishedPost(context.adminId, `Slot filler ${position}`);
    slots.push({ position, postId: post.id });
  }
  await putSlots(context.token, slots).expect(200);
}

// One top-level suite: teardownIntegrationTests closes the shared connection,
// so a second top-level `after` would run against a closed pool.
describe("featured posts", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  describe("admin featured posts", () => {
    it("returns six slots with nulls for empty positions", async () => {
      const { adminId, token } = await setup();
      const post = await publishedPost(adminId);
      await post.update({ featured: true, featuredPosition: 3 });

      const response = await createTestRequest()
        .get(ENDPOINT)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      const body = response.body as SlotsResponseBody;

      assert.deepEqual(
        body.data.slots.map((slot) => slot.position),
        [1, 2, 3, 4, 5, 6],
      );
      assert.equal(body.data.slots[2].post?.id, post.id);
      assert.equal(body.data.slots[2].post?.featuredPosition, 3);
      for (const index of [0, 1, 3, 4, 5]) {
        assert.equal(body.data.slots[index].post, null);
      }
    });

    it("saves the order, marks the posts featured and returns the slots", async () => {
      const { adminId, token } = await setup();
      const first = await publishedPost(adminId, "First");
      const second = await publishedPost(adminId, "Second");

      const response = await putSlots(token, [
        { position: 1, postId: second.id },
        { position: 4, postId: first.id },
        { position: 2, postId: null },
      ]).expect(200);
      const body = response.body as SlotsResponseBody;

      assert.equal(body.data.slots.length, 6);
      assert.equal(body.data.slots[0].post?.id, second.id);
      assert.equal(body.data.slots[3].post?.id, first.id);
      assert.equal(body.data.slots[1].post, null);
      assert.equal(body.data.slots[0].post?.featured, true);

      await first.reload();
      await second.reload();
      assert.equal(first.featured, true);
      assert.equal(first.featuredPosition, 4);
      assert.equal(second.featured, true);
      assert.equal(second.featuredPosition, 1);
    });

    it("replaces the previous layout and un-features removed posts", async () => {
      const { adminId, token } = await setup();
      const kept = await publishedPost(adminId, "Kept");
      const removed = await publishedPost(adminId, "Removed");

      await putSlots(token, [
        { position: 1, postId: kept.id },
        { position: 2, postId: removed.id },
      ]).expect(200);
      // Moving `kept` into a slot another post held a moment ago must not trip
      // the unique index mid-rewrite.
      await putSlots(token, [{ position: 2, postId: kept.id }]).expect(200);

      assert.equal(await positionOf(kept), 2);
      assert.equal(await positionOf(removed), null);
      await removed.reload();
      assert.equal(removed.featured, false);
      await kept.reload();
      assert.equal(kept.featured, true);
    });

    it("leaves the previous layout untouched when the save is rejected", async () => {
      const { adminId, token } = await setup();
      const kept = await publishedPost(adminId, "Kept");
      const draft = await createPost({ adminId, title: "Draft" });

      await putSlots(token, [{ position: 1, postId: kept.id }]).expect(200);
      await expectValidationError(token, [
        { position: 2, postId: kept.id },
        { position: 1, postId: draft.id },
      ]);

      assert.equal(await positionOf(kept), 1);
      assert.equal(await positionOf(draft), null);
    });

    it("rejects duplicate positions", async () => {
      const { adminId, token } = await setup();
      const a = await publishedPost(adminId);
      const b = await publishedPost(adminId);

      await expectValidationError(token, [
        { position: 1, postId: a.id },
        { position: 1, postId: b.id },
      ]);
    });

    it("rejects the same post in two slots", async () => {
      const { adminId, token } = await setup();
      const post = await publishedPost(adminId);

      await expectValidationError(token, [
        { position: 1, postId: post.id },
        { position: 2, postId: post.id },
      ]);
    });

    it("rejects positions outside 1 to 6", async () => {
      const { adminId, token } = await setup();
      const post = await publishedPost(adminId);

      for (const position of [0, 7, 1.5, "1"]) {
        const body = await expectValidationError(token, [
          { position, postId: post.id },
        ]);
        assert.equal(body.error.details?.[0].field, "slots[0].position");
      }
    });

    it("rejects more than six entries", async () => {
      const { token } = await setup();
      const slots = Array.from({ length: 7 }, (_, index) => ({
        position: (index % 6) + 1,
        postId: null,
      }));

      await expectValidationError(token, slots);
    });

    it("rejects a malformed body and non-UUID post ids", async () => {
      const { token } = await setup();

      await createTestRequest()
        .put(ENDPOINT)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(400);
      await expectValidationError(token, [{ position: 1, postId: "not-a-uuid" }]);
    });

    it("rejects an unpublished post", async () => {
      const { adminId, token } = await setup();
      const draft = await createPost({ adminId });

      const body = await expectValidationError(token, [
        { position: 1, postId: draft.id },
      ]);
      assert.equal(body.error.details?.[0].field, "slots[0].postId");
    });

    it("rejects an unknown or deleted post", async () => {
      const { adminId, token } = await setup();
      const deleted = await publishedPost(adminId);
      await deleted.destroy();

      await expectValidationError(token, [{ position: 1, postId: randomUUID() }]);
      await expectValidationError(token, [{ position: 1, postId: deleted.id }]);
    });

    it("rejects unauthenticated requests", async () => {
      await createTestRequest().get(ENDPOINT).expect(401);
      await createTestRequest().put(ENDPOINT).send({ slots: [] }).expect(401);
    });
  });

  describe("public featured listing", () => {
    it("lists slotted posts first in slot order, then other featured posts by date", async () => {
      const { adminId, token } = await setup();
      const day = 24 * 60 * 60 * 1000;
      const now = Date.now();

      const newestUnslotted = await publishedPost(adminId, "Newest unslotted");
      const olderUnslotted = await publishedPost(adminId, "Older unslotted");
      const slotOne = await publishedPost(adminId, "Slot one");
      const slotTwo = await publishedPost(adminId, "Slot two");
      const notFeatured = await publishedPost(adminId, "Not featured");
      await newestUnslotted.update({ featured: true, publishedAt: new Date(now) });
      await olderUnslotted.update({
        featured: true,
        publishedAt: new Date(now - day),
      });
      // The oldest posts hold the slots, so date order alone would put them last.
      await slotOne.update({ publishedAt: new Date(now - 3 * day) });
      await slotTwo.update({ publishedAt: new Date(now - 2 * day) });

      await putSlots(token, [
        { position: 2, postId: slotTwo.id },
        { position: 1, postId: slotOne.id },
      ]).expect(200);

      const response = await createTestRequest()
        .get("/api/v1/posts/featured")
        .expect(200);
      const body = response.body as FeaturedListResponseBody;

      assert.deepEqual(
        body.data.items.map((item) => item.id),
        [slotOne.id, slotTwo.id, newestUnslotted.id, olderUnslotted.id],
      );
      assert.deepEqual(
        body.data.items.map((item) => item.featuredPosition),
        [1, 2, null, null],
      );
      assert.ok(!body.data.items.some((item) => item.id === notFeatured.id));
    });

    it("caps the limit at six", async () => {
      const { adminId } = await setup();
      for (let index = 0; index < 8; index += 1) {
        const post = await publishedPost(adminId, `Featured ${index}`);
        await post.update({ featured: true });
      }

      const capped = await createTestRequest()
        .get("/api/v1/posts/featured?limit=50")
        .expect(200);
      assert.equal((capped.body as FeaturedListResponseBody).data.items.length, 6);

      const defaulted = await createTestRequest()
        .get("/api/v1/posts/featured")
        .expect(200);
      assert.equal(
        (defaulted.body as FeaturedListResponseBody).data.items.length,
        6,
      );
    });
  });

  describe("featured slots stay valid", () => {
    async function slottedPost(context: Context): Promise<Post> {
      const post = await publishedPost(context.adminId);
      await putSlots(context.token, [{ position: 1, postId: post.id }]).expect(200);
      assert.equal(await positionOf(post), 1);
      return post;
    }

    for (const [action, label] of [
      ["unpublish", "unpublished"],
      ["archive", "archived"],
    ] as const) {
      it(`clears the slot when a post is ${label}`, async () => {
        const context = await setup();
        const post = await slottedPost(context);

        await createTestRequest()
          .post(`/api/v1/posts/${post.id}/${action}`)
          .set("Authorization", `Bearer ${context.token}`)
          .expect(200);

        assert.equal(await positionOf(post), null);
      });
    }

    it("clears the slot when the status changes through a post update", async () => {
      const context = await setup();
      const post = await slottedPost(context);

      await createTestRequest()
        .patch(`/api/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${context.token}`)
        .send({ status: PostStatus.DRAFT })
        .expect(200);

      assert.equal(await positionOf(post), null);
    });

    it("clears the slot when a post is deleted, and restoring takes a free one", async () => {
      const context = await setup();
      const post = await slottedPost(context);

      await createTestRequest()
        .delete(`/api/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${context.token}`)
        .expect(200);
      assert.equal(await positionOf(post), null);

      await createTestRequest()
        .post(`/api/v1/posts/${post.id}/restore`)
        .set("Authorization", `Bearer ${context.token}`)
        .expect(200);
      assert.equal(await positionOf(post), 1);
    });

    it("restores a featured post unslotted when every slot is taken", async () => {
      const context = await setup();
      const post = await slottedPost(context);
      await createTestRequest()
        .delete(`/api/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${context.token}`)
        .expect(200);
      await fillAllSlots(context);

      await createTestRequest()
        .post(`/api/v1/posts/${post.id}/restore`)
        .set("Authorization", `Bearer ${context.token}`)
        .expect(200);
      assert.equal(await positionOf(post), null);
    });

    it("clears the slot when featured is turned off", async () => {
      const context = await setup();
      const post = await slottedPost(context);

      const response = await createTestRequest()
        .patch(`/api/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${context.token}`)
        .send({ featured: false })
        .expect(200);

      assert.equal(response.body.data.featuredPosition, null);
      await post.reload();
      assert.equal(post.featured, false);
      assert.equal(post.featuredPosition, null);
    });

    it("keeps the slot through an unrelated post update", async () => {
      const context = await setup();
      const post = await slottedPost(context);

      await createTestRequest()
        .patch(`/api/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${context.token}`)
        .send({ title: "Renamed", featured: true })
        .expect(200);

      assert.equal(await positionOf(post), 1);
    });
  });

  describe("featuring a post claims a slot", () => {
    function patchPost(token: string, post: Post, body: object) {
      return createTestRequest()
        .patch(`/api/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
    }

    it("gives a published post the first empty slot when featured", async () => {
      const context = await setup();
      const inSlotOne = await publishedPost(context.adminId, "In slot one");
      const inSlotThree = await publishedPost(context.adminId, "In slot three");
      await putSlots(context.token, [
        { position: 1, postId: inSlotOne.id },
        { position: 3, postId: inSlotThree.id },
      ]).expect(200);

      const post = await publishedPost(context.adminId, "Newly featured");
      const response = await patchPost(context.token, post, {
        featured: true,
      }).expect(200);

      assert.equal(response.body.data.featuredPosition, 2);
      assert.equal(await positionOf(post), 2);
    });

    it("gives a slot to a post created featured and published", async () => {
      const context = await setup();

      const response = await createTestRequest()
        .post("/api/v1/posts")
        .set("Authorization", `Bearer ${context.token}`)
        .send({
          title: "Created featured",
          content: "<p>Body.</p>",
          status: PostStatus.PUBLISHED,
          featured: true,
        })
        .expect(201);

      assert.equal(response.body.data.featuredPosition, 1);
    });

    it("waits until a featured draft is published", async () => {
      const context = await setup();
      const draft = await createPost({ adminId: context.adminId });

      await patchPost(context.token, draft, { featured: true }).expect(200);
      assert.equal(await positionOf(draft), null);

      await createTestRequest()
        .post(`/api/v1/posts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${context.token}`)
        .expect(200);
      assert.equal(await positionOf(draft), 1);
    });

    it("refuses to feature a post when every slot is taken", async () => {
      const context = await setup();
      await fillAllSlots(context);
      const post = await publishedPost(context.adminId, "One too many");

      const response = await patchPost(context.token, post, {
        featured: true,
      }).expect(400);
      const body = response.body as ErrorResponseBody;

      assert.equal(body.error.details?.[0]?.field, "featured");
      await post.reload();
      assert.equal(post.featured, false);
    });

    it("refuses to publish a featured draft when every slot is taken", async () => {
      const context = await setup();
      const draft = await createPost({ adminId: context.adminId });
      await draft.update({ featured: true });
      await fillAllSlots(context);

      await createTestRequest()
        .post(`/api/v1/posts/${draft.id}/publish`)
        .set("Authorization", `Bearer ${context.token}`)
        .expect(400);
      await draft.reload();
      assert.equal(draft.status, PostStatus.DRAFT);
    });

    it("still saves a post that was already featured without a slot", async () => {
      const context = await setup();
      const overflow = await publishedPost(context.adminId, "Overflow");
      await overflow.update({ featured: true });
      await fillAllSlots(context);

      await patchPost(context.token, overflow, {
        title: "Overflow renamed",
        featured: true,
      }).expect(200);
      assert.equal(await positionOf(overflow), null);
    });
  });

  describe("hero and featured are exclusive", () => {
    function patchPost(token: string, post: Post, body: object) {
      return createTestRequest()
        .patch(`/api/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
    }

    it("refuses to put the hero post in a slot", async () => {
      const { adminId, token } = await setup();
      const hero = await publishedPost(adminId, "Hero");
      await hero.update({ showInHero: true });

      const body = await expectValidationError(token, [
        { position: 1, postId: hero.id },
      ]);
      assert.equal(body.error.details?.[0]?.field, "slots[0].postId");
      assert.equal(await positionOf(hero), null);
    });

    it("takes a featured post out of its slot when it is put in the hero", async () => {
      const context = await setup();
      const post = await publishedPost(context.adminId);
      await putSlots(context.token, [{ position: 1, postId: post.id }]).expect(200);

      await patchPost(context.token, post, { showInHero: true }).expect(200);

      await post.reload();
      assert.equal(post.showInHero, true);
      assert.equal(post.featured, false);
      assert.equal(post.featuredPosition, null);
    });

    it("takes the hero post out of the hero when it is featured", async () => {
      const context = await setup();
      const post = await publishedPost(context.adminId);
      await post.update({ showInHero: true });

      await patchPost(context.token, post, { featured: true }).expect(200);

      await post.reload();
      assert.equal(post.showInHero, false);
      assert.equal(post.featured, true);
      assert.equal(post.featuredPosition, 1);
    });

    it("refuses both at once", async () => {
      const context = await setup();
      const post = await publishedPost(context.adminId);

      const response = await patchPost(context.token, post, {
        featured: true,
        showInHero: true,
      }).expect(400);
      const body = response.body as ErrorResponseBody;

      assert.equal(body.error.details?.[0]?.field, "showInHero");
      await post.reload();
      assert.equal(post.featured, false);
      assert.equal(post.showInHero, false);
    });
  });
});
