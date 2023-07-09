import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccountsRepository } from 'src/database/repositories/bank-accounts.repositories';

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly bankAccountsRepository: BankAccountsRepository,
  ) {}

  create(userId: string, createBankAccountDto: CreateBankAccountDto) {
    return this.bankAccountsRepository.create({
      ...createBankAccountDto,
      userId,
    });
  }

  findAllByUserId(userId: string) {
    return this.bankAccountsRepository.findAllByUserId(userId);
  }

  async update(
    userId: string,
    bankAccountId: string,
    updateBankAccountDto: UpdateBankAccountDto,
  ) {
    const isOwner = await this.bankAccountsRepository.findFirst(
      userId,
      bankAccountId,
    );

    if (!isOwner) throw new NotFoundException('Bank account not found.');

    return this.bankAccountsRepository.update(
      bankAccountId,
      updateBankAccountDto,
    );
  }

  remove(id: string) {
    return `This action removes a #${id} bankAccount`;
  }
}
