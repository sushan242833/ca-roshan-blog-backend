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
  featuredImage: FeaturedImageResponse | null;
  categories: TaxonomyResponse[];
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
    featuredImage: toFeaturedImageResponse(post),
    categories: post.categories?.map(toTaxonomyResponse) ?? [],
    tags: post.tags?.map(toTaxonomyResponse) ?? [],
  };
}

export function toPostDetailResponse(post: Post): PostDetailResponse {
  return {
    ...toPostSummaryResponse(post),
    content: post.content,
  };
}
