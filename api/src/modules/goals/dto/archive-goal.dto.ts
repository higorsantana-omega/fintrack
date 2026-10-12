import { IsBoolean } from 'class-validator';

export class ArchiveGoalDto {
  @IsBoolean()
  returnMoney: boolean;
}
