-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "goalId" UUID;

-- CreateTable
CREATE TABLE "goal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bankAccountId" UUID,
    "name" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "monthlyContribution" DOUBLE PRECISION NOT NULL,
    "initialSaved" DOUBLE PRECISION NOT NULL,
    "contributionDay" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goalSkippedMonth" (
    "id" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "month" DATE NOT NULL,

    CONSTRAINT "goalSkippedMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "goalSkippedMonth_goalId_month_key" ON "goalSkippedMonth"("goalId", "month");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalSkippedMonth" ADD CONSTRAINT "goalSkippedMonth_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: "Metas" categories (EXPENSE for contributions, INCOME for withdrawals) for existing users
INSERT INTO "category" ("id", "userId", "name", "icon", "type")
SELECT gen_random_uuid(), u."id", 'Metas', 'goal', t."type"
FROM "user" u
CROSS JOIN (VALUES ('EXPENSE'::"transactionType"), ('INCOME'::"transactionType")) AS t("type")
WHERE NOT EXISTS (
    SELECT 1 FROM "category" c
    WHERE c."userId" = u."id" AND c."icon" = 'goal' AND c."type" = t."type"
);
