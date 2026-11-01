import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class PurchaseWishlistItemDto {
  /** What was paid, as saved in the launch (R33). */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  paidValue: number;

  /** The launch date; the API takes its São Paulo day. */
  @IsNotEmpty()
  @IsDateString()
  paidDate: string;
}
