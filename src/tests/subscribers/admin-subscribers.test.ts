import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { SubscriberStatus } from "@models/subscriber.model";
import {
  createTestRequest,
  setupIntegrationTest,
  teardownIntegrationTests,
} from "../setup/test-app";
import {
  createAdmin,
  createSubscriber,
  loginAdmin,
} from "../setup/test-helpers";

interface SubscriberListItem {
  id: string;
  email: string;
  status: SubscriberStatus;
}

interface SubscriberListResponseBody {
  success: boolean;
  data: {
    items: SubscriberListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface SubscriberStatsResponseBody {
  success: boolean;
  data: {
    total: number;
    active: number;
    unsubscribed: number;
  };
}

async function seedSubscribers() {
  const active = await createSubscriber({
    email: "active.person@example.test",
    status: SubscriberStatus.ACTIVE,
  });
  const unsubscribed = await createSubscriber({
    email: "gone.person@example.test",
    status: SubscriberStatus.UNSUBSCRIBED,
  });

  return { active, unsubscribed };
}

describe("admin subscribers", () => {
  beforeEach(async () => {
    await setupIntegrationTest();
  });

  after(async () => {
    await teardownIntegrationTests();
  });

  it("rejects an unauthenticated subscriber list", async () => {
    await createTestRequest().get("/api/v1/admin/subscribers").expect(401);
  });

  it("rejects an unauthenticated stats request", async () => {
    await createTestRequest()
      .get("/api/v1/admin/subscribers/stats")
      .expect(401);
  });

  it("returns a paginated subscriber list", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    await seedSubscribers();

    const response = await createTestRequest()
      .get("/api/v1/admin/subscribers")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const body = response.body as SubscriberListResponseBody;

    assert.equal(body.success, true);
    assert.equal(body.data.items.length, 2);
    assert.equal(body.data.pagination.page, 1);
    assert.equal(body.data.pagination.limit, 20);
    assert.equal(body.data.pagination.total, 2);
    assert.equal(body.data.pagination.totalPages, 1);
  });

  it("filters the subscriber list by status", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const { active } = await seedSubscribers();

    const response = await createTestRequest()
      .get("/api/v1/admin/subscribers")
      .query({ status: SubscriberStatus.ACTIVE })
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const body = response.body as SubscriberListResponseBody;

    assert.equal(body.data.items.length, 1);
    assert.equal(body.data.items[0].id, active.id);
    assert.equal(body.data.items[0].status, SubscriberStatus.ACTIVE);
    assert.equal(body.data.pagination.total, 1);
  });

  it("searches subscribers by partial email", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    const { unsubscribed } = await seedSubscribers();

    const response = await createTestRequest()
      .get("/api/v1/admin/subscribers")
      .query({ search: "gone" })
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const body = response.body as SubscriberListResponseBody;

    assert.equal(body.data.items.length, 1);
    assert.equal(body.data.items[0].email, unsubscribed.email);
  });

  it("returns correct stats for the seeded subscribers", async () => {
    const admin = await createAdmin();
    const login = await loginAdmin(admin);
    await seedSubscribers();

    const response = await createTestRequest()
      .get("/api/v1/admin/subscribers/stats")
      .set("Authorization", `Bearer ${login.accessToken}`)
      .expect(200);
    const body = response.body as SubscriberStatsResponseBody;

    assert.equal(body.success, true);
    assert.deepEqual(body.data, {
      total: 2,
      active: 1,
      unsubscribed: 1,
    });
  });
});
