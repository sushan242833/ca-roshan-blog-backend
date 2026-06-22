import { randomUUID } from "crypto";
import sequelize from "@config/config";
import { Admin, Category, Post, Subscriber } from "@models/index";
import { PostStatus } from "@models/post.model";
import { SubscriberStatus } from "@models/subscriber.model";
import { hashValue } from "@utils/bcrypt";
import { createTestRequest } from "./test-app";

export interface TestAdmin {
  admin: Admin;
  email: string;
  password: string;
}

export interface LoginAdminResult {
  accessToken: string;
}

export interface LoginResponseBody {
  success: boolean;
  data: {
    accessToken: string;
  };
}

interface CreateAdminOptions {
  email?: string;
  password?: string;
}

interface CreateCategoryOptions {
  name?: string;
  slug?: string;
}

interface CreatePostOptions {
  adminId: string;
  title?: string;
  slug?: string;
  content?: string;
  status?: PostStatus;
}

interface CreateSubscriberOptions {
  email?: string;
  status?: SubscriberStatus;
}

function uniqueEmail(prefix: string): string {
  return `${prefix}.${randomUUID()}@example.test`;
}

function uniqueSlug(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export async function createAdmin(
  options: CreateAdminOptions = {},
): Promise<TestAdmin> {
  const email = options.email ?? uniqueEmail("admin");
  const password = options.password ?? "SecretPassword123";
  const passwordHash = await hashValue(password);

  await sequelize.query(
    `
      INSERT INTO admins (
        id,
        name,
        email,
        password_hash,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        :name,
        :email,
        :passwordHash,
        true,
        now(),
        now()
      )
    `,
    {
      replacements: {
        name: "Test Admin",
        email,
        passwordHash,
      },
    },
  );

  const admin = await Admin.findOne({ where: { email } });
  if (!admin) {
    throw new Error("Failed to create test admin.");
  }

  return { admin, email, password };
}

export async function loginAdmin(admin: TestAdmin): Promise<LoginAdminResult> {
  const response = await createTestRequest()
    .post("/api/auth/login")
    .send({ email: admin.email, password: admin.password })
    .expect(200);
  const body = response.body as LoginResponseBody;

  return {
    accessToken: body.data.accessToken,
  };
}

export async function createCategory(
  options: CreateCategoryOptions = {},
): Promise<Category> {
  const name = options.name ?? "Test Category";
  const slug = options.slug ?? uniqueSlug("test-category");

  return Category.create({ name, slug });
}

export async function createPost(
  options: CreatePostOptions,
): Promise<Post> {
  const title = options.title ?? "Test Post";
  const slug = options.slug ?? uniqueSlug("test-post");
  const content = options.content ?? "This is test post content.";
  const status = options.status ?? PostStatus.DRAFT;

  return Post.create({
    title,
    slug,
    content,
    excerpt: "This is test post content.",
    metaTitle: title,
    metaDescription: "This is test post content.",
    status,
    featured: false,
    readingTime: 1,
    viewCount: 0,
    adminId: options.adminId,
    publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
  });
}

export async function createSubscriber(
  options: CreateSubscriberOptions = {},
): Promise<Subscriber> {
  const email = options.email ?? uniqueEmail("subscriber");
  const status = options.status ?? SubscriberStatus.PENDING;

  return Subscriber.create({
    email,
    status,
    verificationToken:
      status === SubscriberStatus.PENDING ? randomUUID().replace(/-/g, "") : null,
    unsubscribeToken: randomUUID().replace(/-/g, ""),
    verifiedAt: status === SubscriberStatus.ACTIVE ? new Date() : null,
  });
}
