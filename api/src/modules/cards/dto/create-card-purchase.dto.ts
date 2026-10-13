import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { MONTH_PATTERN } from 'src/pipes/ParseMonthPipe';

export enum CardPurchaseKind {
  PURCHASE = 'PURCHASE',
  REFUND = 'REFUND',
}

export const MIN_INSTALLMENTS = 2;
export const MAX_INSTALLMENTS = 48;

export class CreateCardPurchaseDto {
  @IsEnum(CardPurchaseKind)
  kind: CardPurchaseKind;

  @IsString()
  @IsNotEmpty()
  description: string;

  /** Optional on refunds only. */
  @ValidateIf(
    (dto) => dto.kind !== CardPurchaseKind.REFUND || dto.categoryId != null,
  )
  @IsUUID()
  categoryId?: string;

  /** The total, or the installment value of a purchase already in progress. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;

  /** Purchase date; the original purchase date for one already in progress. */
  @IsNotEmpty()
  @IsDateString()
  date: string;

  /** Present only on installment purchases. */
  @IsOptional()
  @IsInt()
  @Min(MIN_INSTALLMENTS)
  @Max(MAX_INSTALLMENTS)
  installmentsCount?: number;

  /** Present only on installment purchases already in progress (R18). */
  @IsOptional()
  @IsInt()
  @Min(1)
  currentInstallment?: number;

  /** Due month (YYYY-MM) of the invoice holding the current installment. */
  @IsOptional()
  @Matches(MONTH_PATTERN)
  anchorInvoiceMonth?: string;
}
