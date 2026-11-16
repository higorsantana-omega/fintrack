-- CreateEnum
CREATE TYPE "onboardingStep" AS ENUM ('ACCOUNTS', 'CARDS', 'CARD_ENTRIES', 'BUDGETS', 'GOALS', 'DEBTS', 'WISHLIST', 'REVIEW');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "onboardingStep" "onboardingStep";
