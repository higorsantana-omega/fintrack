import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { MAX_INSTALLMENTS, MIN_INSTALLMENTS } from './create-card-purchase.dto';

/** The kind, the card and the anchor invoice never change (KTD5). */
export class UpdateCardPurchaseDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_INSTALLMENTS)
  @Max(MAX_INSTALLMENTS)
  installmentsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  currentInstallment?: number;
}
