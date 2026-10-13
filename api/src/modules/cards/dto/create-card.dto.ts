import {
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsHexColor()
  color: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  limit: number;

  @IsInt()
  @Min(1)
  @Max(31)
  closingDay: number;

  @IsInt()
  @Min(1)
  @Max(31)
  dueDay: number;
}
