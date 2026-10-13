import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRecurringChargeDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;

  @IsUUID()
  categoryId: string;

  @IsNotEmpty()
  @IsDateString()
  firstChargeDate: string;
}
