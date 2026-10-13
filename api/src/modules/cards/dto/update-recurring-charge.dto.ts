import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

/** Only the rule changes; charges already created stay as they are (R21). */
export class UpdateRecurringChargeDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;

  @IsUUID()
  categoryId: string;
}
