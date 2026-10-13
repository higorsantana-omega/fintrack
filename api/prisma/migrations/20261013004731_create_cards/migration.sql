-- CreateEnum
CREATE TYPE "cardPurchaseKind" AS ENUM ('PURCHASE', 'REFUND');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "cardInvoiceMonth" DATE,
ADD COLUMN     "creditCardId" UUID;

-- CreateTable
CREATE TABLE "creditCard" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "limit" DOUBLE PRECISION NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creditCardCycle" (
    "id" UUID NOT NULL,
    "creditCardId" UUID NOT NULL,
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,

    CONSTRAINT "creditCardCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cardPurchase" (
    "id" UUID NOT NULL,
    "creditCardId" UUID NOT NULL,
    "categoryId" UUID,
    "recurringChargeId" UUID,
    "kind" "cardPurchaseKind" NOT NULL,
    "description" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "installmentsCount" INTEGER NOT NULL DEFAULT 1,
    "currentInstallment" INTEGER NOT NULL DEFAULT 1,
    "anchorInvoiceMonth" DATE,
    "occurrenceDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cardPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cardInstallment" (
    "id" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "invoiceMonth" DATE NOT NULL,

    CONSTRAINT "cardInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurringCharge" (
    "id" UUID NOT NULL,
    "creditCardId" UUID NOT NULL,
    "categoryId" UUID,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "firstChargeDate" DATE NOT NULL,
    "materializedThrough" DATE NOT NULL,
    "cancelledAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurringCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creditCardCycle_creditCardId_effectiveFrom_key" ON "creditCardCycle"("creditCardId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "cardPurchase_recurringChargeId_occurrenceDate_key" ON "cardPurchase"("recurringChargeId", "occurrenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "cardInstallment_purchaseId_number_key" ON "cardInstallment"("purchaseId", "number");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "creditCard"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditCard" ADD CONSTRAINT "creditCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditCardCycle" ADD CONSTRAINT "creditCardCycle_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "creditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardPurchase" ADD CONSTRAINT "cardPurchase_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "creditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardPurchase" ADD CONSTRAINT "cardPurchase_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardPurchase" ADD CONSTRAINT "cardPurchase_recurringChargeId_fkey" FOREIGN KEY ("recurringChargeId") REFERENCES "recurringCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardInstallment" ADD CONSTRAINT "cardInstallment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "cardPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurringCharge" ADD CONSTRAINT "recurringCharge_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "creditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurringCharge" ADD CONSTRAINT "recurringCharge_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: default expense categories and "Fatura de cartão" for existing users
INSERT INTO "category" ("id", "userId", "name", "icon", "type")
SELECT gen_random_uuid(), u."id", c."name", c."icon", 'EXPENSE'::"transactionType"
FROM "user" u
CROSS JOIN (VALUES
    ('Alimentação', 'food'),
    ('Mercado', 'grocery'),
    ('Lazer', 'fun'),
    ('Transporte', 'transport'),
    ('Viagem', 'travel'),
    ('Educação', 'education'),
    ('Roupas', 'clothes'),
    ('Outros', 'other'),
    ('Fatura de cartão', 'credit-card')
) AS c("name", "icon")
WHERE NOT EXISTS (
    SELECT 1 FROM "category" e
    WHERE e."userId" = u."id" AND e."icon" = c."icon" AND e."type" = 'EXPENSE'::"transactionType"
);
