import { Injectable, NotFoundException } from '@nestjs/common';
import { BorrowersRepository } from 'src/database/repositories/borrowers.repositories';

@Injectable()
export class ValidateBorrowerOwnershipService {
  constructor(private readonly borrowersRepository: BorrowersRepository) {}

  async validate(userId: string, borrowerId: string) {
    const borrower = await this.borrowersRepository.findFirst(
      userId,
      borrowerId,
    );

    if (!borrower) throw new NotFoundException('Borrower not found.');

    return borrower;
  }
}
