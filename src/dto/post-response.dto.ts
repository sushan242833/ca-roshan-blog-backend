import Admin from "@models/admin.model";
import { Category } from "@models/category.model";
import { Post, PostStatus } from "@models/post.model";
import { Tag } from "@models/tag.model";

export interface FeaturedImageResponse {
  id: string;
  url: string;
  fileName: string;
}

export interface TaxonomyResponse {
  id: string;
  name: string;
  slug: string;
}

export interface AuthorResponse {
  name: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

export interface PostSummaryResponse {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: PostStatus;
  featured: boolean;
  readingTime: number;
  viewCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  pdfUrl: string | null;
  pdfLabel: string | null;
  showFeaturedImage: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: AuthorResponse | null;
  featuredImage: FeaturedImageResponse | null;
  categories: TaxonomyResponse[];
  category: TaxonomyResponse | null;
  tags: TaxonomyResponse[];
}

export interface PostDetailResponse extends PostSummaryResponse {
  content: string;
}

function toTaxonomyResponse(item: Category | Tag): TaxonomyResponse {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
  };
}

function toAuthorResponse(post: Post): AuthorResponse | null {
  if (!post.author) {
    return null;
  }
  return {
    name: post.author.name,
    title: post.author.title ?? null,
    bio: post.author.bio ?? null,
    avatarUrl: post.author.avatarUrl ?? null,
  };
}

function toFeaturedImageResponse(post: Post): FeaturedImageResponse | null {
  if (!post.featuredImage) {
    return null;
  }

  return {
    id: post.featuredImage.id,
    url: post.featuredImage.url,
    fileName: post.featuredImage.fileName,
  };
}

// Explicit allowlist mapping — fields are copied one by one, never spread from
// the model. In particular `searchText` (the internal plain-text search
// projection) is deliberately omitted and must never be added here.
export function toPostSummaryResponse(post: Post): PostSummaryResponse {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? null,
    status: post.status,
    featured: post.featured,
    readingTime: post.readingTime,
    viewCount: post.viewCount,
    metaTitle: post.metaTitle ?? null,
    metaDescription: post.metaDescription ?? null,
    pdfUrl: post.pdfUrl ?? null,
    pdfLabel: post.pdfLabel ?? null,
    showFeaturedImage: post.showFeaturedImage ?? true,
    publishedAt: post.publishedAt ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: toAuthorResponse(post),
    featuredImage: toFeaturedImageResponse(post),
    categories: post.categories?.map(toTaxonomyResponse) ?? [],
    category: post.category ? toTaxonomyResponse(post.category) : null,
    tags: post.tags?.map(toTaxonomyResponse) ?? [],
  };
}

export function toPostDetailResponse(post: Post): PostDetailResponse {
  return {
    ...toPostSummaryResponse(post),
    content: post.content,
  };
}

export interface ChapterSummary {
  id: string;
  title: string;
  order: number;
  /** One-line summary shown under the title in chapter listings. */
  excerpt: string | null;
}

// Returned by GET /api/v1/posts/:slug/chapters — the article landing page.
// Short posts come back with `paginated: false` and the full `content` inline
// (rendered as one page, unchanged behaviour). Large posts come back with
// `paginated: true`, the chapter list, and `content: null`.
export interface ChapterIndexResponse extends PostSummaryResponse {
  paginated: boolean;
  totalChapters: number;
  chapters: ChapterSummary[];
  content: string | null;
}

// Returned by GET /api/v1/posts/:slug/chapters/:chapterId — one chapter page.
export interface ChapterDetailResponse extends PostSummaryResponse {
  totalChapters: number;
  chapter: {
    id: string;
    title: string;
    order: number;
    html: string;
    excerpt: string | null;
  };
  prev: ChapterSummary | null;
  next: ChapterSummary | null;
}
