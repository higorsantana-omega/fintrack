import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class UpdateExpectedValueDto {
  /** The open installment the new value starts at (R11). */
  @IsInt()
  @Min(1)
  fromInstallment: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;
}
