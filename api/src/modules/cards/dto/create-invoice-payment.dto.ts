import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class CreateInvoicePaymentDto {
  @IsUUID()
  bankAccountId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}
