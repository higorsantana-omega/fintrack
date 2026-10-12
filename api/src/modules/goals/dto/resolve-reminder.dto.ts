import { IsEnum, IsNumber, IsPositive, ValidateIf } from 'class-validator';

export enum ReminderAction {
  CONFIRM = 'CONFIRM',
  SKIP = 'SKIP',
}

export class ResolveReminderDto {
  @IsEnum(ReminderAction)
  action: ReminderAction;

  @ValidateIf((dto) => dto.action === ReminderAction.CONFIRM)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value?: number;
}
