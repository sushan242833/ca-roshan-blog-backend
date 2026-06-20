export interface CreatePostDto {
  title: string;
  content: string;
  categoryIds?: string[];
  tagIds?: string[];
  published?: boolean;
}

export default CreatePostDto;
