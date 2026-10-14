import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { MONTH_PATTERN } from 'src/pipes/ParseMonthPipe';
import { MAX_INSTALLMENTS } from '../debts.constants';

const hasEntry = (dto: CreateDebtDto) =>
  dto.entryBankAccountId != null || dto.entryValue != null;

export class CreateDebtDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  installmentValue: number;

  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  installmentsCount: number;

  @IsInt()
  @Min(1)
  @Max(31)
  dueDay: number;

  /** The installment to pay next; 1 on a new debt. */
  @IsInt()
  @Min(1)
  nextInstallment: number;

  /** Due month (YYYY-MM) of the next installment. */
  @Matches(MONTH_PATTERN)
  nextInstallmentMonth: string;

  /** The loan money received (R7); both fields together or neither. */
  @ValidateIf(hasEntry)
  @IsUUID()
  entryBankAccountId?: string;

  @ValidateIf(hasEntry)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  entryValue?: number;
}
