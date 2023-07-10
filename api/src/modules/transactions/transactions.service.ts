import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsRepository } from 'src/database/repositories/transactions.repositories';
import { ValidateBankAccountOwnershipService } from '../bank-accounts/validate-bank-account-ownership.service';
import { ValidateCategoryOwnershipService } from '../categories/validate-category-ownership.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
  ) {}

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    await this.validateEntitiesOwnership(userId, createTransactionDto);

    return this.transactionsRepository.create({
      ...createTransactionDto,
      userId,
    });
  }

  findAllByUserId(userId: string) {
    return this.transactionsRepository.findMany(userId);
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  async update(
    userId: string,
    transactionId: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    await this.validateEntitiesOwnership(userId, {
      ...updateTransactionDto,
      transactionId,
    });

    return this.transactionsRepository.update(
      transactionId,
      updateTransactionDto,
    );
  }

  async remove(userId: string, transactionId: string) {
    await this.validateEntitiesOwnership(userId, { transactionId });

    await this.transactionsRepository.delete(transactionId);
  }

  private async validateEntitiesOwnership(
    userId: string,
    transaction: Partial<CreateTransactionDto> & { transactionId?: string },
  ) {
    const { bankAccountId, transactionId, categoryId } = transaction;

    if (bankAccountId) {
      await this.validateBankAccountOwnershipService.validate(
        userId,
        transaction.bankAccountId,
      );
    }

    if (categoryId) {
      await this.validateCategoryOwnershipService.validate(
        userId,
        transaction.categoryId,
      );
    }

    if (transactionId) {
      const isOwner = await this.transactionsRepository.findFirst(
        transaction.transactionId,
      );
      if (!isOwner) throw new NotFoundException('Transaction not found.');
    }
  }
}
