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
