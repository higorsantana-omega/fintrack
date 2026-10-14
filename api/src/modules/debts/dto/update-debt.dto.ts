import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MONTH_PATTERN } from 'src/pipes/ParseMonthPipe';
import { MAX_INSTALLMENTS } from '../debts.constants';

export class UpdateDebtDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  @Max(31)
  dueDay: number;

  /** The three fields below only change while no installment has a payment (R12). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  installmentsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextInstallment?: number;

  @IsOptional()
  @Matches(MONTH_PATTERN)
  nextInstallmentMonth?: string;
}
