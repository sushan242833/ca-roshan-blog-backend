export interface UpdatePostDto {
  title?: string;
  content?: string;
  categoryIds?: string[];
  tagIds?: string[];
  published?: boolean;
}

export default UpdatePostDto;
