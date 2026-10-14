import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import type { NewInstallmentRow } from 'src/modules/debts/debt-calculations';

const debtInclude = Prisma.validator<Prisma.DebtInclude>()({
  installments: {
    select: {
      number: true,
      dueMonth: true,
      expectedValue: true,
      paidBeforeApp: true,
      paymentTransactionId: true,
    },
    orderBy: { number: 'asc' },
  },
  transactions: {
    select: {
      id: true,
      name: true,
      value: true,
      date: true,
      type: true,
      bankAccountId: true,
      bankAccount: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: 'asc' },
  },
});

export type DebtWithRelations = Prisma.DebtGetPayload<{
  include: typeof debtInclude;
}>;

export type DebtData = { name: string; dueDay: number };

export type DebtEntryData = Omit<
  Prisma.TransactionUncheckedCreateInput,
  'debtId'
>;

export type DebtPaymentData = Omit<
  Prisma.TransactionUncheckedCreateInput,
  'debtId'
>;

export type InstallmentsReconciliation = {
  update: NewInstallmentRow[];
  create: NewInstallmentRow[];
  removeNumbers: number[];
};

class InstallmentsNotOpenError extends Error {}

// Reconciling a 480-installment debt updates its rows one by one.
const RECONCILIATION_TIMEOUT_MS = 30000;

@Injectable()
export class DebtsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /** Creates the debt, its rows and the optional loan entry together (KTD4). */
  create(
    userId: string,
    data: DebtData,
    rows: NewInstallmentRow[],
    entry: DebtEntryData | null,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const debt = await tx.debt.create({ data: { userId, ...data } });

      await tx.debtInstallment.createMany({
        data: rows.map((row) => ({ debtId: debt.id, ...row })),
      });
      if (entry) {
        await tx.transaction.create({ data: { ...entry, debtId: debt.id } });
      }

      return debt;
    });
  }

  findManyByUserId(userId: string): Promise<DebtWithRelations[]> {
    return this.prismaService.debt.findMany({
      where: { userId },
      include: debtInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Only the debts with an open installment, so paid debts are not read. */
  findOpenByUserId(userId: string): Promise<DebtWithRelations[]> {
    return this.prismaService.debt.findMany({
      where: {
        userId,
        installments: {
          some: { paidBeforeApp: false, paymentTransactionId: null },
        },
      },
      include: debtInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  findFirst(userId: string, debtId: string): Promise<DebtWithRelations> {
    return this.prismaService.debt.findFirst({
      where: { userId, id: debtId },
      include: debtInclude,
    });
  }

  /** Updates the debt and, with a reconciliation, its rows by number (R12). */
  update(
    debtId: string,
    data: DebtData,
    reconciliation: InstallmentsReconciliation | null,
  ) {
    return this.prismaService.$transaction(
      async (tx) => {
        if (reconciliation) {
          await tx.debtInstallment.deleteMany({
            where: { debtId, number: { in: reconciliation.removeNumbers } },
          });
          for (const row of reconciliation.update) {
            await tx.debtInstallment.update({
              where: { debtId_number: { debtId, number: row.number } },
              data: {
                dueMonth: row.dueMonth,
                paidBeforeApp: row.paidBeforeApp,
              },
            });
          }
          await tx.debtInstallment.createMany({
            data: reconciliation.create.map((row) => ({ debtId, ...row })),
          });
        }

        return tx.debt.update({ where: { id: debtId }, data });
      },
      { timeout: RECONCILIATION_TIMEOUT_MS },
    );
  }

  /**
   * Creates the expense and marks the installments as paid by it, in one
   * database transaction (KTD3). Resolves to null, with nothing written, when
   * any of the installments is no longer open.
   */
  async pay(debtId: string, numbers: number[], payment: DebtPaymentData) {
    try {
      return await this.prismaService.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: { ...payment, debtId },
        });
        const { count } = await tx.debtInstallment.updateMany({
          where: {
            debtId,
            number: { in: numbers },
            paymentTransactionId: null,
            paidBeforeApp: false,
          },
          data: { paymentTransactionId: transaction.id },
        });

        if (count !== numbers.length) throw new InstallmentsNotOpenError();

        return transaction;
      });
    } catch (error) {
      if (error instanceof InstallmentsNotOpenError) return null;
      throw error;
    }
  }

  /** Sets the expected value of the open installments from a number on (R11). */
  updateExpectedValue(debtId: string, fromNumber: number, value: number) {
    return this.prismaService.debtInstallment.updateMany({
      where: {
        debtId,
        number: { gte: fromNumber },
        paidBeforeApp: false,
        paymentTransactionId: null,
      },
      data: { expectedValue: value },
    });
  }

  delete(debtId: string) {
    return this.prismaService.debt.delete({ where: { id: debtId } });
  }
}
