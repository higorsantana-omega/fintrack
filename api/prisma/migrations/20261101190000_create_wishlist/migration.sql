-- CreateEnum
CREATE TYPE "wishlistItemStatus" AS ENUM ('ACTIVE', 'PURCHASED', 'GAVE_UP');

-- CreateTable
CREATE TABLE "wishlist" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlistItem" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "wishlistId" UUID NOT NULL,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "plannedMonth" DATE,
    "plannedDay" DATE,
    "nextReminder" DATE,
    "status" "wishlistItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "paidValue" DOUBLE PRECISION,
    "paidDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlistLink" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlistLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlistPrice" (
    "id" UUID NOT NULL,
    "linkId" UUID NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlistPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_userId_key_key" ON "wishlist"("userId", "key");

-- CreateIndex
CREATE INDEX "wishlistItem_wishlistId_idx" ON "wishlistItem"("wishlistId");

-- CreateIndex
CREATE INDEX "wishlistItem_userId_status_nextReminder_idx" ON "wishlistItem"("userId", "status", "nextReminder");

-- CreateIndex
CREATE INDEX "wishlistLink_itemId_idx" ON "wishlistLink"("itemId");

-- CreateIndex
CREATE INDEX "wishlistPrice_linkId_idx" ON "wishlistPrice"("linkId");

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistItem" ADD CONSTRAINT "wishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistItem" ADD CONSTRAINT "wishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistItem" ADD CONSTRAINT "wishlistItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistLink" ADD CONSTRAINT "wishlistLink_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "wishlistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistPrice" ADD CONSTRAINT "wishlistPrice_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "wishlistLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: the "Geral" list for existing users. Key and name mirror src/modules/wishlist/wishlist.constants.ts
INSERT INTO "wishlist" ("id", "userId", "name", "key")
SELECT gen_random_uuid(), u."id", 'Geral', 'general'
FROM "user" u
WHERE NOT EXISTS (
    SELECT 1 FROM "wishlist" w
    WHERE w."userId" = u."id" AND w."key" = 'general'
);
