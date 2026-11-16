import { IsNumber, Min } from 'class-validator';

export class SetOpeningAdjustmentDto {
  /** What the bank says is left to pay on the invoice. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  remaining: number;
}
