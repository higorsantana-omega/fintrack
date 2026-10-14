-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "borrowerId" UUID,
ADD COLUMN     "debtId" UUID;

-- CreateTable
CREATE TABLE "debt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debtInstallment" (
    "id" UUID NOT NULL,
    "debtId" UUID NOT NULL,
    "paymentTransactionId" UUID,
    "number" INTEGER NOT NULL,
    "dueMonth" DATE NOT NULL,
    "expectedValue" DOUBLE PRECISION NOT NULL,
    "paidBeforeApp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "debtInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrower" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "borrower_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debtInstallment_paymentTransactionId_idx" ON "debtInstallment"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "debtInstallment_debtId_number_key" ON "debtInstallment"("debtId", "number");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debt"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "borrower"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt" ADD CONSTRAINT "debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debtInstallment" ADD CONSTRAINT "debtInstallment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debtInstallment" ADD CONSTRAINT "debtInstallment_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrower" ADD CONSTRAINT "borrower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: "Dívidas" and "Empréstimos" categories (EXPENSE and INCOME each) for existing users
INSERT INTO "category" ("id", "userId", "name", "icon", "type")
SELECT gen_random_uuid(), u."id", c."name", c."icon", t."type"
FROM "user" u
CROSS JOIN (VALUES
    ('Dívidas', 'debt'),
    ('Empréstimos', 'loan')
) AS c("name", "icon")
CROSS JOIN (VALUES ('EXPENSE'::"transactionType"), ('INCOME'::"transactionType")) AS t("type")
WHERE NOT EXISTS (
    SELECT 1 FROM "category" e
    WHERE e."userId" = u."id" AND e."icon" = c."icon" AND e."type" = t."type"
);
