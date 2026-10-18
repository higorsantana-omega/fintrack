import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CATEGORY_COLOR_PATTERN, CATEGORY_ICON_PATTERN } from './patterns';

/** Icon and color only apply to groups; the service refuses them on a subcategory. */
export class UpdateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsOptional()
  @Matches(CATEGORY_ICON_PATTERN)
  icon?: string;

  @IsOptional()
  @Matches(CATEGORY_COLOR_PATTERN)
  color?: string;
}
