import { IsOptional, IsUUID } from 'class-validator';

/** Required for a group; a subcategory's items always go to its group. */
export class DeleteCategoryDto {
  @IsOptional()
  @IsUUID()
  destinationCategoryId?: string;
}
