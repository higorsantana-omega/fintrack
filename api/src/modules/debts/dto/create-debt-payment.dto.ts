import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDebtPaymentDto {
  /** The installments this one payment covers (R20). */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  installmentNumbers: number[];

  @IsUUID()
  bankAccountId: string;

  /** What was actually paid, which can differ from the expected sum (R19). */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}
