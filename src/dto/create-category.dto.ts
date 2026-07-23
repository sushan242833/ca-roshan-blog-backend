export interface CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string | null;
}

export default CreateCategoryDto;
