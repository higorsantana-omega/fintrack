import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MONTH_PATTERN } from 'src/pipes/ParseMonthPipe';

/** Body of both create and update: an update replaces the omitted fields (R4). */
export class SaveWishlistItemDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name: string;

  /** The list; Geral when omitted (R2). */
  @IsOptional()
  @IsUUID()
  wishlistId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Planned month (YYYY-MM). */
  @IsOptional()
  @Matches(MONTH_PATTERN)
  plannedMonth?: string;

  /** Planned day, only together with the month (R6). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  plannedDay?: number;
}
