import { IsNumber, IsPositive } from 'class-validator';

export class CategoryBudgetDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}
