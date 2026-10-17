import { TransactionType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SummaryQueryDto {
  @IsEnum(TransactionType)
  type: TransactionType;
}
