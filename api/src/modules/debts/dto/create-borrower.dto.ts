import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateBorrowerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  /** What the person already owed before the app; 0 when omitted (R25). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingBalance?: number;
}
