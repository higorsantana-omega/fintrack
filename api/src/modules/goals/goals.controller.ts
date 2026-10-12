import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import ActiveUserId from 'src/decorators/activeUserId.decorator';
import { ParseMonthPipe } from 'src/pipes/ParseMonthPipe';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ResolveReminderDto } from './dto/resolve-reminder.dto';
import { ArchiveGoalDto } from './dto/archive-goal.dto';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@ActiveUserId() userId: string, @Body() createGoalDto: CreateGoalDto) {
    return this.goalsService.create(userId, createGoalDto);
  }

  @Get()
  findAll(@ActiveUserId() userId: string) {
    return this.goalsService.findAllByUserId(userId);
  }

  @Get('summary')
  getSummary(@ActiveUserId() userId: string) {
    return this.goalsService.getSummary(userId);
  }

  @Get('reminders')
  findReminders(@ActiveUserId() userId: string) {
    return this.goalsService.findReminders(userId);
  }

  @Get(':goalId')
  findOne(
    @ActiveUserId() userId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
  ) {
    return this.goalsService.findOne(userId, goalId);
  }

  @Put(':goalId')
  update(
    @ActiveUserId() userId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return this.goalsService.update(userId, goalId, updateGoalDto);
  }

  @Delete(':goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @ActiveUserId() userId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
  ) {
    return this.goalsService.remove(userId, goalId);
  }

  @Post(':goalId/contributions')
  contribute(
    @ActiveUserId() userId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @Body() createContributionDto: CreateContributionDto,
  ) {
    return this.goalsService.contribute(userId, goalId, createContributionDto);
  }

  @Post(':goalId/reminders/:month')
  resolveReminder(
    @ActiveUserId() userId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @Param('month', ParseMonthPipe) month: string,
    @Body() resolveReminderDto: ResolveReminderDto,
  ) {
    return this.goalsService.resolveReminder(
      userId,
      goalId,
      month,
      resolveReminderDto,
    );
  }

  @Post(':goalId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(
    @ActiveUserId() userId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @Body() archiveGoalDto: ArchiveGoalDto,
  ) {
    return this.goalsService.archive(userId, goalId, archiveGoalDto);
  }
}
