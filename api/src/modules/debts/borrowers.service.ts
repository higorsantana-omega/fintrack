import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  BorrowerWithRelations,
  BorrowersRepository,
} from 'src/database/repositories/borrowers.repositories';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { isPrismaError } from 'src/database/prisma-errors';
import {
  getToday,
  toCalendarDate,
  toCents,
  toNoonUtc,
} from 'src/shared/calendar';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { LOAN_CATEGORY_ICON } from '../categories/categories.constants';
import { isWithinDateWindow } from '../cards/card-calculations';
import { ValidateBorrowerOwnershipService } from './validate-borrower-ownership.service';
import { CreateBorrowerDto } from './dto/create-borrower.dto';
import {
  BorrowerMovementKind,
  CreateBorrowerMovementDto,
} from './dto/create-borrower-movement.dto';
import { UpdateBorrowerDto } from './dto/update-borrower.dto';
import { getBorrowerBalance } from './debt-calculations';

const LOAN_NAME_PREFIX = 'Empréstimo';
const RETURN_NAME_PREFIX = 'Devolução';
const DATE_OUT_OF_RANGE_MESSAGE = 'The date must be within ten years of today.';
const HAS_TRANSACTIONS_MESSAGE = 'A person with movements cannot be deleted.';
const RETURN_ABOVE_BALANCE_MESSAGE =
  'The return cannot be greater than what the person owes.';

@Injectable()
export class BorrowersService {
  constructor(
    private readonly borrowersRepository: BorrowersRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly validateBorrowerOwnershipService: ValidateBorrowerOwnershipService,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
  ) {}

  create(userId: string, createBorrowerDto: CreateBorrowerDto) {
    return this.borrowersRepository.create(userId, {
      name: createBorrowerDto.name,
      openingBalance: createBorrowerDto.openingBalance ?? 0,
    });
  }

  /** Every person with the balance values; the web splits "Em dia" (R4, R29). */
  async findAllByUserId(userId: string) {
    const borrowers = await this.borrowersRepository.findManyByUserId(userId);

    return borrowers.map((borrower) => ({
      id: borrower.id,
      name: borrower.name,
      ...getBorrowerBalance(this.toSnapshot(borrower)),
    }));
  }

  async findOne(userId: string, borrowerId: string) {
    const borrower = await this.validateBorrowerOwnershipService.validate(
      userId,
      borrowerId,
    );

    return {
      id: borrower.id,
      name: borrower.name,
      openingBalance: borrower.openingBalance,
      ...getBorrowerBalance(this.toSnapshot(borrower)),
      movements: borrower.transactions.map((transaction) => ({
        id: transaction.id,
        name: transaction.name,
        value: transaction.value,
        date: transaction.date,
        type: transaction.type,
        bankAccount: transaction.bankAccount,
      })),
    };
  }

  async update(
    userId: string,
    borrowerId: string,
    updateBorrowerDto: UpdateBorrowerDto,
  ) {
    await this.validateBorrowerOwnershipService.validate(userId, borrowerId);

    return this.borrowersRepository.update(borrowerId, updateBorrowerDto);
  }

  async remove(userId: string, borrowerId: string) {
    const borrower = await this.validateBorrowerOwnershipService.validate(
      userId,
      borrowerId,
    );

    if (borrower.transactions.length > 0) {
      throw new ConflictException(HAS_TRANSACTIONS_MESSAGE);
    }

    try {
      await this.borrowersRepository.delete(borrowerId);
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new ConflictException(HAS_TRANSACTIONS_MESSAGE);
      }
      throw error;
    }

    return null;
  }

  /**
   * "Emprestei" is an expense and "Devolveu" an income on the account (R26).
   * A return above the current balance answers 409 with the maximum (R28).
   */
  async createMovement(
    userId: string,
    borrowerId: string,
    createBorrowerMovementDto: CreateBorrowerMovementDto,
  ) {
    const borrower = await this.validateBorrowerOwnershipService.validate(
      userId,
      borrowerId,
    );
    const { kind, bankAccountId, value } = createBorrowerMovementDto;
    await this.validateBankAccountOwnershipService.validate(
      userId,
      bankAccountId,
    );

    const day = toCalendarDate(new Date(createBorrowerMovementDto.date));
    if (!isWithinDateWindow(day, getToday())) {
      throw new BadRequestException(DATE_OUT_OF_RANGE_MESSAGE);
    }

    const isReturn = kind === BorrowerMovementKind.RETURN;
    const type = isReturn ? 'INCOME' : 'EXPENSE';
    const category = await this.categoriesRepository.findByIcon(
      userId,
      LOAN_CATEGORY_ICON,
      type,
    );
    if (!category) {
      throw new InternalServerErrorException('Loan category not found.');
    }

    if (isReturn) {
      const { maxReturn } = getBorrowerBalance(this.toSnapshot(borrower));

      if (toCents(value) > toCents(maxReturn)) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: RETURN_ABOVE_BALANCE_MESSAGE,
          maxReturn,
        });
      }
    }

    return this.transactionsRepository.create({
      userId,
      bankAccountId,
      categoryId: category.id,
      borrowerId,
      name: `${isReturn ? RETURN_NAME_PREFIX : LOAN_NAME_PREFIX}: ${
        borrower.name
      }`,
      value,
      date: toNoonUtc(day),
      type,
    });
  }

  private toSnapshot(borrower: BorrowerWithRelations) {
    return {
      previousBalance: borrower.openingBalance,
      transactions: borrower.transactions,
    };
  }
}
