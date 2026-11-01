import { IsNumber, IsPositive } from 'class-validator';

export class CreateWishlistPriceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;
}
