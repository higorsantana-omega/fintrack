// Development-only seed: one user with data for every feature of the app.
// Run with `npm run seed`; it recreates the user, so it is safe to re-run.
import 'dotenv/config';
import { PrismaClient, TransactionType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { getNewInstallmentRows } from '../src/modules/debts/debt-calculations';
import { getInstallments } from '../src/modules/cards/card-calculations';
import {
  CARD_PAYMENT_CATEGORY_KEY,
  DEBT_CATEGORY_KEY,
  GOAL_CATEGORY_KEY,
  LOAN_CATEGORY_KEY,
  buildDefaultCategories,
} from '../src/modules/categories/categories.constants';
import {
  getDayInMonth,
  getMonthKey,
  getMonthStart,
  getToday,
  toNoonUtc,
} from '../src/shared/calendar';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The seed is for development only.');
}

const SEED_EMAIL = 'dev@fintrack.com';
const SEED_PASSWORD = '12345678';

const prisma = new PrismaClient();
const today = getToday();
const thisMonth = getMonthKey(today);

/** Noon-UTC instant of a day in a month relative to this one, never after today. */
const dayAt = (monthOffset: number, day: number) => {
  const date = getDayInMonth(thisMonth + monthOffset, day);
  return toNoonUtc(date > today ? today : date);
};

async function main() {
  await prisma.user.deleteMany({ where: { email: SEED_EMAIL } });

  const user = await prisma.user.create({
    data: {
      name: 'Dev User',
      email: SEED_EMAIL,
      password: await hash(SEED_PASSWORD, 12),
      categories: { createMany: { data: buildDefaultCategories() } },
    },
  });
  const userId = user.id;

  const categories = await prisma.category.findMany({ where: { userId } });
  const cat = (key: string, type: TransactionType = 'EXPENSE') => {
    const found = categories.find((c) => c.key === key && c.type === type);
    if (!found) throw new Error(`Category not found: ${key} (${type})`);
    return found.id;
  };

  const [checking, investment, cash] = await Promise.all(
    [
      {
        name: 'Nubank',
        initialBalance: 3500,
        type: 'CHECKING',
        color: '#8A05BE',
      },
      {
        name: 'Corretora',
        initialBalance: 12000,
        type: 'INVESTMENT',
        color: '#12B886',
      },
      { name: 'Carteira', initialBalance: 150, type: 'CASH', color: '#FAB005' },
    ].map((data) =>
      prisma.bankAccount.create({ data: { userId, ...data } as never }),
    ),
  );

  // Account transactions: six months of income and expenses ------------------
  const monthly = (
    key: string,
    type: TransactionType,
    name: string,
    value: number,
    day: number,
    bankAccountId = checking.id,
  ) => ({ key, type, name, value, day, bankAccountId });
  const recurring = [
    monthly('salary', 'INCOME', 'Salário', 6500, 5),
    monthly('housing', 'EXPENSE', 'Aluguel', 1800, 6),
    monthly('internet', 'EXPENSE', 'Internet', 119.9, 10),
    monthly('supermarket', 'EXPENSE', 'Mercado', 640, 12),
    monthly('restaurants', 'EXPENSE', 'Restaurante', 185.5, 15, cash.id),
    monthly('fuel', 'EXPENSE', 'Combustível', 220, 18),
    monthly('pharmacy', 'EXPENSE', 'Farmácia', 87.35, 20, cash.id),
  ];
  const transactions = [-5, -4, -3, -2, -1, 0].flatMap((offset) =>
    recurring.map(({ key, type, name, value, day, bankAccountId }) => ({
      userId,
      bankAccountId,
      categoryId: cat(key, type),
      name,
      value: Math.round(value * (1 + ((offset + 6) % 3) * 0.05) * 100) / 100,
      date: dayAt(offset, day),
      type,
    })),
  );
  // Extra income so the Income tab has more than one category.
  transactions.push(
    {
      userId,
      bankAccountId: investment.id,
      categoryId: cat('investments', 'INCOME'),
      name: 'Rendimentos',
      value: 240,
      date: dayAt(0, 1),
      type: 'INCOME',
    },
    {
      userId,
      bankAccountId: checking.id,
      categoryId: cat('business_activities', 'INCOME'),
      name: 'Projeto freelance',
      value: 1500,
      date: dayAt(-1, 22),
      type: 'INCOME',
    },
  );
  await prisma.transaction.createMany({ data: transactions });

  // Goals ---------------------------------------------------------------------
  const goalOf = (data: Record<string, unknown>) =>
    prisma.goal.create({
      data: { userId, bankAccountId: checking.id, ...data } as never,
    });
  const travel = await goalOf({
    name: 'Viagem',
    targetAmount: 8000,
    monthlyContribution: 500,
    initialSaved: 1000,
    contributionDay: 10,
    startDate: getMonthStart(thisMonth - 4),
    endDate: getMonthStart(thisMonth + 12),
  });
  await goalOf({
    name: 'Reserva de emergência (concluída)',
    targetAmount: 3000,
    monthlyContribution: 500,
    initialSaved: 0,
    contributionDay: 8,
    startDate: getMonthStart(thisMonth - 8),
    endDate: getMonthStart(thisMonth - 3),
    archivedAt: new Date(),
  });
  const skipped = getMonthStart(thisMonth - 2);
  await prisma.goalSkippedMonth.create({
    data: { goalId: travel.id, month: skipped },
  });
  await prisma.transaction.createMany({
    data: [-4, -3, -1, 0].map((offset) => ({
      userId,
      bankAccountId: checking.id,
      categoryId: cat(GOAL_CATEGORY_KEY),
      goalId: travel.id,
      name: `Aporte: ${travel.name}`,
      value: 500,
      date: dayAt(offset, 10),
      type: 'EXPENSE' as const,
    })),
  });

  // Credit cards ----------------------------------------------------------------
  const makeCard = (
    name: string,
    color: string,
    limit: number,
    closing: number,
    due: number,
    archived = false,
  ) =>
    prisma.creditCard.create({
      data: {
        userId,
        name,
        color,
        limit,
        archivedAt: archived ? new Date() : null,
        cycles: {
          create: {
            closingDay: closing,
            dueDay: due,
            effectiveFrom: getMonthStart(thisMonth - 8),
          },
        },
      },
      include: { cycles: true },
    });
  const mainCard = await makeCard('Nubank Roxinho', '#8A05BE', 6000, 25, 5);
  const old = await makeCard('Cartão antigo', '#868E96', 2000, 20, 28, true);

  const purchase = async (
    card: Awaited<ReturnType<typeof makeCard>>,
    description: string,
    value: number,
    offset: number,
    day: number,
    categoryKey: string | null,
    opts: { installments?: number; refund?: boolean } = {},
  ) => {
    const installmentsCount = opts.installments ?? 1;
    const instant = dayAt(offset, day);
    const purchaseDay = new Date(
      Date.UTC(
        instant.getUTCFullYear(),
        instant.getUTCMonth(),
        instant.getUTCDate(),
      ),
    );
    const rows = getInstallments(
      {
        totalValue: value,
        installmentsCount,
        currentInstallment: 1,
        purchaseDay,
        anchorInvoiceMonth: null,
      },
      card.cycles,
    );
    await prisma.cardPurchase.create({
      data: {
        creditCardId: card.id,
        categoryId: categoryKey ? cat(categoryKey) : null,
        kind: opts.refund ? 'REFUND' : 'PURCHASE',
        description,
        totalValue: value,
        purchaseDate: dayAt(offset, day),
        installmentsCount,
        installments: {
          create: rows.map((r) => ({
            number: r.number,
            value: r.value,
            invoiceMonth: getMonthStart(r.invoiceMonth),
          })),
        },
      },
    });
  };
  await purchase(mainCard, 'Notebook', 4200, -3, 8, 'electronics', {
    installments: 10,
  });
  await purchase(mainCard, 'Tênis', 600, -2, 14, 'clothing', {
    installments: 3,
  });
  await purchase(mainCard, 'Curso online', 349.9, -1, 3, 'online_courses');
  await purchase(mainCard, 'Supermercado', 312.4, -1, 19, 'supermarket');
  await purchase(mainCard, 'Jantar', 156, 0, 2, 'restaurants');
  await purchase(mainCard, 'Compra sem categoria', 49.9, 0, 1, null);
  await purchase(mainCard, 'Estorno do tênis', 120, -1, 20, 'clothing', {
    refund: true,
  });
  await purchase(old, 'Eletrodoméstico', 1200, -5, 10, 'housing', {
    installments: 4,
  });

  await prisma.recurringCharge.create({
    data: {
      creditCardId: mainCard.id,
      categoryId: cat('streaming'),
      description: 'Netflix',
      value: 55.9,
      firstChargeDate: getMonthStart(thisMonth - 3),
      materializedThrough: new Date(
        getMonthStart(thisMonth - 3).getTime() - 86400000,
      ),
    },
  });

  // Pay the two oldest invoices of the main card (the rest stays open/closed).
  await prisma.transaction.createMany({
    data: [
      { month: -3, value: 420, day: 5, name: 'Fatura Nubank Roxinho' },
      { month: -2, value: 1062.4, day: 5, name: 'Fatura Nubank Roxinho' },
    ].map(({ month, value, day, name }) => ({
      userId,
      bankAccountId: checking.id,
      categoryId: cat(CARD_PAYMENT_CATEGORY_KEY),
      creditCardId: mainCard.id,
      cardInvoiceMonth: getMonthStart(thisMonth + month),
      name,
      value,
      date: dayAt(month, day),
      type: 'EXPENSE' as const,
    })),
  });

  // Debts ---------------------------------------------------------------------
  const makeDebt = async (
    name: string,
    count: number,
    next: number,
    nextOffset: number,
    value: number,
    paid: number[],
  ) => {
    const debt = await prisma.debt.create({
      data: { userId, name, dueDay: 15 },
    });
    await prisma.debtInstallment.createMany({
      data: getNewInstallmentRows({
        installmentsCount: count,
        nextInstallment: next,
        nextDueMonth: thisMonth + nextOffset,
        expectedValue: value,
      }).map((row) => ({ debtId: debt.id, ...row })),
    });
    for (const number of paid) {
      const tx = await prisma.transaction.create({
        data: {
          userId,
          bankAccountId: checking.id,
          categoryId: cat(DEBT_CATEGORY_KEY),
          debtId: debt.id,
          name: `${name} (${number}/${count})`,
          value,
          date: dayAt(nextOffset + (number - next), 15),
          type: 'EXPENSE',
        },
      });
      await prisma.debtInstallment.update({
        where: { debtId_number: { debtId: debt.id, number } },
        data: { paymentTransactionId: tx.id },
      });
    }
  };
  // Financing: 3 installments paid before the app, 2 paid, one overdue, rest open.
  await makeDebt('Financiamento do carro', 24, 4, -4, 950, [4, 5, 6]);
  await makeDebt('Empréstimo pessoal', 6, 1, -5, 300, [1, 2, 3, 4, 5, 6]);

  // Borrowers --------------------------------------------------------------------
  const lender = await prisma.borrower.create({
    data: { userId, name: 'João', openingBalance: 200 },
  });
  await prisma.borrower.create({
    data: { userId, name: 'Maria (quitado)', openingBalance: 0 },
  });
  await prisma.transaction.createMany({
    data: [
      {
        type: 'EXPENSE' as const,
        name: 'Empréstimo: João',
        value: 300,
        offset: -2,
        key: LOAN_CATEGORY_KEY,
      },
      {
        type: 'INCOME' as const,
        name: 'Devolução: João',
        value: 150,
        offset: -1,
        key: LOAN_CATEGORY_KEY,
      },
    ].map(({ type, name, value, offset, key }) => ({
      userId,
      bankAccountId: checking.id,
      categoryId: cat(key, type),
      borrowerId: lender.id,
      name,
      value,
      date: dayAt(offset, 12),
      type,
    })),
  });

  console.log(`Seed done. Login: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
