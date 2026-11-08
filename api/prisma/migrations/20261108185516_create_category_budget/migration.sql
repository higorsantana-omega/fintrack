-- CreateTable
CREATE TABLE "categoryBudget" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "categoryBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoryBudgetMonth" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "month" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "categoryBudgetMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoryBudget_categoryId_key" ON "categoryBudget"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "categoryBudgetMonth_budgetId_month_key" ON "categoryBudgetMonth"("budgetId", "month");

-- AddForeignKey
ALTER TABLE "categoryBudget" ADD CONSTRAINT "categoryBudget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoryBudgetMonth" ADD CONSTRAINT "categoryBudgetMonth_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "categoryBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
