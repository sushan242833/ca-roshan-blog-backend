import { PostStatus } from "@models/post.model";

export interface CreatePostDto {
  title: string;
  content: string;
  slug?: string;
  excerpt?: string | null;
  featuredImageId?: string | null;
  categoryId?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  pdfUrl?: string | null;
  pdfLabel?: string | null;
  showFeaturedImage?: boolean;
  status?: PostStatus;
  featured?: boolean;
  categoryIds?: string[];
  tagIds?: string[];
  published?: boolean;
}

export default CreatePostDto;
