import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { MONTH_PATTERN } from 'src/pipes/ParseMonthPipe';

export class PostponeWishlistItemDto {
  /** New planned month (YYYY-MM) (R20). */
  @Matches(MONTH_PATTERN)
  plannedMonth: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  plannedDay?: number;
}
