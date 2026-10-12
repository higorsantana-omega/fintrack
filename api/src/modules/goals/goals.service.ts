import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import {
  GoalData,
  GoalWithRelations,
  GoalsRepository,
} from 'src/database/repositories/goals.repositories';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { ValidateGoalOwnershipService } from './validate-goal-ownership.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ReminderAction, ResolveReminderDto } from './dto/resolve-reminder.dto';
import { ArchiveGoalDto } from './dto/archive-goal.dto';
import {
  CONTRIBUTION_NAME_PREFIX,
  GOAL_CATEGORY_ICON,
  WITHDRAWAL_NAME_PREFIX,
} from './goals.constants';
import {
  formatMonthKey,
  getDueDate,
  getEvolutionSeries,
  getGoalStatus,
  getGoalsSummary,
  getMonthStart,
  getPendingMonths,
  getResolvedMonths,
  getSavedByMonthSeries,
  getTodayInGoalsTimeZone,
  getTotalSaved,
  parseMonthKey,
  toGoalsCalendarDate,
  toNoonUtc,
} from './goal-calculations';

const NOT_PENDING_MESSAGE = 'This month is not pending for this goal.';
const HAS_CONTRIBUTIONS_MESSAGE =
  'A goal with contributions can only be archived.';

function isPrismaError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly validateGoalOwnershipService: ValidateGoalOwnershipService,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
  ) {}

  async create(userId: string, createGoalDto: CreateGoalDto) {
    const data = await this.toGoalData(userId, createGoalDto);

    return this.goalsRepository.create(userId, data);
  }

  async findAllByUserId(userId: string) {
    const today = getTodayInGoalsTimeZone();
    const goals = await this.goalsRepository.findManyByUserId(userId);

    return goals.map((goal) => this.toGoalView(goal, today));
  }

  async getSummary(userId: string) {
    const today = getTodayInGoalsTimeZone();
    const goals = await this.goalsRepository.findManyByUserId(userId);

    return {
      ...getGoalsSummary(goals, today),
      savedByMonth: getSavedByMonthSeries(goals, today),
    };
  }

  async findReminders(userId: string) {
    const today = getTodayInGoalsTimeZone();
    const goals = await this.goalsRepository.findManyByUserId(userId);

    return goals
      .flatMap((goal) =>
        getPendingMonths(goal, today).map((monthKey) => ({ goal, monthKey })),
      )
      .sort(
        (a, b) =>
          a.monthKey - b.monthKey ||
          a.goal.createdAt.getTime() - b.goal.createdAt.getTime(),
      )
      .map(({ goal, monthKey }) => ({
        goalId: goal.id,
        goalName: goal.name,
        month: formatMonthKey(monthKey),
        dueDate: getDueDate(monthKey, goal.contributionDay),
        monthlyContribution: goal.monthlyContribution,
        bankAccount: goal.bankAccount,
      }));
  }

  async findOne(userId: string, goalId: string) {
    const today = getTodayInGoalsTimeZone();
    const goal = await this.validateGoalOwnershipService.validate(
      userId,
      goalId,
    );
    const transactions = await this.transactionsRepository.findManyByGoalId(
      goalId,
    );

    const history = [
      ...transactions.map((transaction) => ({
        id: transaction.id,
        kind:
          transaction.type === 'EXPENSE'
            ? ('CONTRIBUTION' as const)
            : ('WITHDRAWAL' as const),
        date: transaction.date,
        value: transaction.value,
        bankAccount: transaction.bankAccount,
      })),
      ...goal.skippedMonths.map((skipped) => ({
        id: skipped.id,
        kind: 'SKIPPED' as const,
        date: skipped.month,
        value: null,
        bankAccount: null,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      ...this.toGoalView(goal, today),
      evolution: getEvolutionSeries(goal, today),
      resolvedMonths: getResolvedMonths(goal).map(formatMonthKey),
      history,
    };
  }

  async update(userId: string, goalId: string, updateGoalDto: UpdateGoalDto) {
    const goal = await this.validateGoalOwnershipService.validate(
      userId,
      goalId,
    );
    this.assertNotArchived(goal);

    const data = await this.toGoalData(userId, updateGoalDto);

    return this.goalsRepository.update(goalId, data);
  }

  async remove(userId: string, goalId: string) {
    const goal = await this.validateGoalOwnershipService.validate(
      userId,
      goalId,
    );
    this.assertNotArchived(goal);

    if (goal.transactions.length > 0) {
      throw new ConflictException(HAS_CONTRIBUTIONS_MESSAGE);
    }

    try {
      await this.goalsRepository.delete(goalId);
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new ConflictException(HAS_CONTRIBUTIONS_MESSAGE);
      }
      throw error;
    }

    return null;
  }

  async contribute(
    userId: string,
    goalId: string,
    createContributionDto: CreateContributionDto,
  ) {
    const goal = await this.validateGoalOwnershipService.validate(
      userId,
      goalId,
    );

    const { status } = getGoalStatus(goal, getTodayInGoalsTimeZone());
    if (status !== 'IN_PROGRESS') {
      throw new ConflictException(
        'Contributions are only accepted while the goal is in progress.',
      );
    }

    const date = toNoonUtc(
      toGoalsCalendarDate(new Date(createContributionDto.date)),
    );

    return this.createContribution(
      userId,
      goal,
      createContributionDto.value,
      date,
    );
  }

  async resolveReminder(
    userId: string,
    goalId: string,
    month: string,
    resolveReminderDto: ResolveReminderDto,
  ) {
    const goal = await this.validateGoalOwnershipService.validate(
      userId,
      goalId,
    );
    const monthKey = parseMonthKey(month);

    const pendingMonths = getPendingMonths(goal, getTodayInGoalsTimeZone());
    if (!pendingMonths.includes(monthKey)) {
      throw new ConflictException(NOT_PENDING_MESSAGE);
    }

    if (resolveReminderDto.action === ReminderAction.CONFIRM) {
      const dueDate = toNoonUtc(getDueDate(monthKey, goal.contributionDay));

      return this.createContribution(
        userId,
        goal,
        resolveReminderDto.value,
        dueDate,
      );
    }

    try {
      return await this.goalsRepository.createSkippedMonth(
        goalId,
        getMonthStart(monthKey),
      );
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(NOT_PENDING_MESSAGE);
      }
      throw error;
    }
  }

  async archive(
    userId: string,
    goalId: string,
    archiveGoalDto: ArchiveGoalDto,
  ) {
    const goal = await this.validateGoalOwnershipService.validate(
      userId,
      goalId,
    );
    this.assertNotArchived(goal);

    const withdrawal = archiveGoalDto.returnMoney
      ? {
          userId,
          categoryId: (await this.getGoalCategory(userId, 'INCOME')).id,
          namePrefix: WITHDRAWAL_NAME_PREFIX,
          date: toNoonUtc(getTodayInGoalsTimeZone()),
        }
      : null;

    const archived = await this.goalsRepository.archive(goalId, withdrawal);
    if (!archived) throw new ConflictException('Goal is already archived.');

    return null;
  }

  private async createContribution(
    userId: string,
    goal: GoalWithRelations,
    value: number,
    date: Date,
  ) {
    if (!goal.bankAccountId) {
      throw new ConflictException('The goal has no source bank account.');
    }

    const category = await this.getGoalCategory(userId, 'EXPENSE');

    return this.transactionsRepository.create({
      userId,
      bankAccountId: goal.bankAccountId,
      categoryId: category.id,
      goalId: goal.id,
      name: `${CONTRIBUTION_NAME_PREFIX}${goal.name}`,
      value,
      date,
      type: 'EXPENSE',
    });
  }

  private async getGoalCategory(userId: string, type: TransactionType) {
    const category = await this.categoriesRepository.findByIcon(
      userId,
      GOAL_CATEGORY_ICON,
      type,
    );

    if (!category) {
      throw new InternalServerErrorException('Goal category not found.');
    }

    return category;
  }

  private async toGoalData(
    userId: string,
    goalDto: CreateGoalDto,
  ): Promise<GoalData> {
    await this.validateBankAccountOwnershipService.validate(
      userId,
      goalDto.bankAccountId,
    );

    const startDate = toGoalsCalendarDate(new Date(goalDto.startDate));
    const endDate = toGoalsCalendarDate(new Date(goalDto.endDate));

    if (endDate < startDate) {
      throw new BadRequestException(
        'The end date must not be before the start date.',
      );
    }

    return {
      bankAccountId: goalDto.bankAccountId,
      name: goalDto.name,
      targetAmount: goalDto.targetAmount,
      monthlyContribution: goalDto.monthlyContribution,
      initialSaved: goalDto.initialSaved,
      contributionDay: goalDto.contributionDay,
      startDate,
      endDate,
    };
  }

  private assertNotArchived(goal: GoalWithRelations) {
    if (goal.archivedAt) {
      throw new ConflictException('Archived goals are read-only.');
    }
  }

  private toGoalView(goal: GoalWithRelations, today: Date) {
    return {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      monthlyContribution: goal.monthlyContribution,
      initialSaved: goal.initialSaved,
      contributionDay: goal.contributionDay,
      startDate: goal.startDate,
      endDate: goal.endDate,
      archivedAt: goal.archivedAt,
      createdAt: goal.createdAt,
      bankAccountId: goal.bankAccountId,
      bankAccount: goal.bankAccount,
      totalSaved: getTotalSaved(goal),
      ...getGoalStatus(goal, today),
    };
  }
}
