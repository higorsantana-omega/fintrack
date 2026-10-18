import { TransactionType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CATEGORY_COLOR_PATTERN, CATEGORY_ICON_PATTERN } from './patterns';

const isGroup = (dto: CreateCategoryDto) => !dto.parentId;

/** A subcategory sends `parentId` and a name; a group sends type, icon and color. */
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ValidateIf(isGroup)
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ValidateIf(isGroup)
  @Matches(CATEGORY_ICON_PATTERN)
  icon?: string;

  @ValidateIf(isGroup)
  @Matches(CATEGORY_COLOR_PATTERN)
  color?: string;
}
