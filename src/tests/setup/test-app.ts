import request from "supertest";
import app from "../../app";
import {
  closeTestDatabase,
  resetTestDatabase,
  setupTestDatabase,
} from "./test-db";

export type TestRequest = request.Agent;

export function createTestRequest(): TestRequest {
  return request(app);
}

export async function setupIntegrationTest(): Promise<void> {
  await setupTestDatabase();
  await resetTestDatabase();
}

export async function teardownIntegrationTests(): Promise<void> {
  await closeTestDatabase();
}
