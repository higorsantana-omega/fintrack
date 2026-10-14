import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
} from 'class-validator';

export enum BorrowerMovementKind {
  LEND = 'LEND',
  RETURN = 'RETURN',
}

export class CreateBorrowerMovementDto {
  /** LEND is "Emprestei", an expense; RETURN is "Devolveu", an income (R26). */
  @IsEnum(BorrowerMovementKind)
  kind: BorrowerMovementKind;

  @IsUUID()
  bankAccountId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}
