import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateBorrowerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  /** What the person already owed before the app; left as is when omitted (R25). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingBalance?: number;
}
