import { PostStatus } from "@models/post.model";

export interface UpdatePostDto {
  title?: string;
  content?: string;
  slug?: string;
  excerpt?: string | null;
  featuredImageId?: string | null;
  categoryId?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  status?: PostStatus;
  featured?: boolean;
  categoryIds?: string[];
  tagIds?: string[];
  published?: boolean;
}

export default UpdatePostDto;
