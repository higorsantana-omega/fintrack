import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  targetAmount: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monthlyContribution: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialSaved: number;

  @IsInt()
  @Min(1)
  @Max(31)
  contributionDay: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  bankAccountId: string;
}
