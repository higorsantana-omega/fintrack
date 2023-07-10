import { Injectable } from '@nestjs/common';
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

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }

  private async validateEntitiesOwnership(
    userId: string,
    transaction: CreateTransactionDto,
  ) {
    await this.validateBankAccountOwnershipService.validate(
      userId,
      transaction.bankAccountId,
    );

    await this.validateCategoryOwnershipService.validate(
      userId,
      transaction.categoryId,
    );
  }
}
