-- AlterTable
ALTER TABLE "category" ADD COLUMN     "color" TEXT,
ADD COLUMN     "key" TEXT,
ADD COLUMN     "parentId" UUID,
ALTER COLUMN "icon" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "category_parentId_idx" ON "category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "category_userId_type_key_key" ON "category"("userId", "type", "key");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The catalog below repeats categories.constants.ts. Order matters: items are
-- relinked before any old category is deleted, because their foreign keys are SET NULL.

-- Default groups
INSERT INTO "category" ("id", "userId", "name", "key", "icon", "color", "type")
SELECT gen_random_uuid(), u."id", v."name", v."key", v."icon", v."color", v."type"::"transactionType"
FROM "user" u
CROSS JOIN (VALUES
    ('shopping', 'Shopping', 'shopping-bag', '#E64980', 'EXPENSE'),
    ('education', 'Education', 'graduation-cap', '#4C6EF5', 'EXPENSE'),
    ('services', 'Services', 'phone', '#15AABF', 'EXPENSE'),
    ('utilities', 'Utilities', 'plug-zap', '#FAB005', 'EXPENSE'),
    ('food', 'Food', 'utensils', '#FD7E14', 'EXPENSE'),
    ('health', 'Health', 'heart-pulse', '#FA5252', 'EXPENSE'),
    ('transfers', 'Transfers', 'arrow-left-right', '#868E96', 'EXPENSE'),
    ('housing', 'Housing', 'house', '#7950F2', 'EXPENSE'),
    ('digital_services', 'Digital services', 'cloud', '#BE4BDB', 'EXPENSE'),
    ('leisure', 'Leisure', 'party-popper', '#228BE6', 'EXPENSE'),
    ('transport', 'Transport', 'car', '#12B886', 'EXPENSE'),
    ('taxes_fees', 'Taxes and fees', 'receipt', '#212529', 'EXPENSE'),
    ('personal_care', 'Personal care', 'sparkles', '#BE4BDB', 'EXPENSE'),
    ('donations', 'Donations', 'hand-heart', '#82C91E', 'EXPENSE'),
    ('other', 'Other', 'ellipsis', '#868E96', 'EXPENSE'),
    ('income', 'Income', 'wallet', '#40C057', 'INCOME'),
    ('investments', 'Investments', 'trending-up', '#12B886', 'INCOME'),
    ('other_income', 'Other income', 'circle-plus', '#82C91E', 'INCOME')
) AS v("key", "name", "icon", "color", "type")
WHERE NOT EXISTS (
  SELECT 1 FROM "category" e
  WHERE e."userId" = u."id" AND e."type" = v."type"::"transactionType" AND e."key" = v."key"
);

-- Default subcategories, linked to their group by key
INSERT INTO "category" ("id", "userId", "parentId", "name", "key", "icon", "type")
SELECT gen_random_uuid(), u."id", p."id", v."name", v."key", v."icon", v."type"::"transactionType"
FROM "user" u
CROSS JOIN (VALUES
    ('online_shopping', 'Online shopping', 'shopping-cart', 'shopping', 'EXPENSE'),
    ('bookstore', 'Bookstore', 'book-open', 'shopping', 'EXPENSE'),
    ('sporting_goods', 'Sporting goods', 'volleyball', 'shopping', 'EXPENSE'),
    ('electronics', 'Electronics', 'cpu', 'shopping', 'EXPENSE'),
    ('kids_toys', 'Kids and toys', 'blocks', 'shopping', 'EXPENSE'),
    ('office_supplies', 'Office supplies', 'paperclip', 'shopping', 'EXPENSE'),
    ('pets', 'Pets', 'paw-print', 'shopping', 'EXPENSE'),
    ('clothing', 'Clothing', 'shirt', 'shopping', 'EXPENSE'),
    ('school', 'School', 'school', 'education', 'EXPENSE'),
    ('online_courses', 'Online courses', 'monitor-play', 'education', 'EXPENSE'),
    ('kindergarten', 'Kindergarten', 'baby', 'education', 'EXPENSE'),
    ('university', 'University', 'university', 'education', 'EXPENSE'),
    ('telecom', 'Telecom', 'radio-tower', 'services', 'EXPENSE'),
    ('internet', 'Internet', 'wifi', 'services', 'EXPENSE'),
    ('mobile_phone', 'Mobile phone', 'smartphone', 'services', 'EXPENSE'),
    ('tv', 'TV', 'tv', 'services', 'EXPENSE'),
    ('electricity', 'Electricity', 'zap', 'utilities', 'EXPENSE'),
    ('gas', 'Gas', 'flame', 'utilities', 'EXPENSE'),
    ('water', 'Water', 'droplets', 'utilities', 'EXPENSE'),
    ('delivery', 'Delivery', 'bike', 'food', 'EXPENSE'),
    ('supermarket', 'Supermarket', 'shopping-basket', 'food', 'EXPENSE'),
    ('restaurants', 'Restaurants', 'utensils-crossed', 'food', 'EXPENSE'),
    ('dentist', 'Dentist', 'smile', 'health', 'EXPENSE'),
    ('pharmacy', 'Pharmacy', 'pill', 'health', 'EXPENSE'),
    ('hospital_labs', 'Hospital and labs', 'hospital', 'health', 'EXPENSE'),
    ('optometry', 'Optometry', 'glasses', 'health', 'EXPENSE'),
    ('health_insurance', 'Health insurance', 'shield-plus', 'health', 'EXPENSE'),
    ('pix', 'PIX', 'qr-code', 'transfers', 'EXPENSE'),
    ('boleto', 'Boleto', 'barcode', 'transfers', 'EXPENSE'),
    ('doc', 'DOC', 'file-text', 'transfers', 'EXPENSE'),
    ('ted', 'TED', 'arrow-right-left', 'transfers', 'EXPENSE'),
    ('third_party_transfers', 'Third-party transfers', 'users', 'transfers', 'EXPENSE'),
    ('household_items', 'Household items', 'armchair', 'housing', 'EXPENSE'),
    ('rent', 'Rent', 'key-round', 'housing', 'EXPENSE'),
    ('property_tax', 'Property tax', 'landmark', 'housing', 'EXPENSE'),
    ('streaming', 'Streaming', 'clapperboard', 'digital_services', 'EXPENSE'),
    ('music', 'Music', 'music', 'digital_services', 'EXPENSE'),
    ('games', 'Games', 'gamepad-2', 'digital_services', 'EXPENSE'),
    ('cashback', 'Cashback', 'badge-percent', 'digital_services', 'EXPENSE'),
    ('tickets', 'Tickets', 'ticket', 'leisure', 'EXPENSE'),
    ('gym', 'Gym', 'dumbbell', 'leisure', 'EXPENSE'),
    ('wellness', 'Wellness', 'flower-2', 'leisure', 'EXPENSE'),
    ('wellness_fitness', 'Wellness and fitness', 'activity', 'leisure', 'EXPENSE'),
    ('entertainment', 'Entertainment', 'popcorn', 'leisure', 'EXPENSE'),
    ('stadiums_arenas', 'Stadiums and arenas', 'trophy', 'leisure', 'EXPENSE'),
    ('sports', 'Sports', 'medal', 'leisure', 'EXPENSE'),
    ('tourism', 'Tourism', 'plane', 'leisure', 'EXPENSE'),
    ('fuel', 'Fuel', 'fuel', 'transport', 'EXPENSE'),
    ('public_transport', 'Public transport', 'bus', 'transport', 'EXPENSE'),
    ('taxi_rideshare', 'Taxi and rideshare', 'car-taxi-front', 'transport', 'EXPENSE'),
    ('parking', 'Parking', 'square-parking', 'transport', 'EXPENSE'),
    ('toll', 'Toll', 'milestone', 'transport', 'EXPENSE'),
    ('vehicle_maintenance', 'Vehicle maintenance', 'wrench', 'transport', 'EXPENSE'),
    ('vehicle_insurance', 'Vehicle insurance', 'shield-check', 'transport', 'EXPENSE'),
    ('vehicle_tax', 'Vehicle tax and licensing', 'file-badge', 'transport', 'EXPENSE'),
    ('income_tax', 'Income tax', 'percent', 'taxes_fees', 'EXPENSE'),
    ('bank_fees', 'Bank fees', 'banknote', 'taxes_fees', 'EXPENSE'),
    ('interest_fines', 'Interest and fines', 'triangle-alert', 'taxes_fees', 'EXPENSE'),
    ('other_taxes', 'Other taxes', 'file-minus', 'taxes_fees', 'EXPENSE'),
    ('barber_hairdresser', 'Hairdresser and barber', 'scissors', 'personal_care', 'EXPENSE'),
    ('cosmetics', 'Cosmetics', 'palette', 'personal_care', 'EXPENSE'),
    ('aesthetics', 'Aesthetics', 'flower', 'personal_care', 'EXPENSE'),
    ('charity', 'Charity', 'heart-handshake', 'donations', 'EXPENSE'),
    ('gifts', 'Gifts', 'gift', 'donations', 'EXPENSE'),
    ('tithe', 'Tithe', 'church', 'donations', 'EXPENSE'),
    ('salary', 'Salary', 'briefcase', 'income', 'INCOME'),
    ('retirement', 'Retirement', 'armchair', 'income', 'INCOME'),
    ('business_activities', 'Business activities', 'store', 'income', 'INCOME'),
    ('government_aid', 'Government aid', 'landmark', 'income', 'INCOME'),
    ('non_recurring_income', 'Non-recurring income', 'coins', 'income', 'INCOME'),
    ('returns_interest', 'Returns and interest', 'percent', 'investments', 'INCOME'),
    ('dividends', 'Dividends', 'piggy-bank', 'investments', 'INCOME'),
    ('reimbursement', 'Reimbursement', 'undo-2', 'other_income', 'INCOME'),
    ('gift_received', 'Gift received', 'gift', 'other_income', 'INCOME'),
    ('item_sales', 'Item sales', 'tag', 'other_income', 'INCOME')
) AS v("key", "name", "icon", "groupKey", "type")
JOIN "category" p ON p."userId" = u."id" AND p."type" = v."type"::"transactionType" AND p."key" = v."groupKey"
WHERE NOT EXISTS (
  SELECT 1 FROM "category" e
  WHERE e."userId" = u."id" AND e."type" = v."type"::"transactionType" AND e."key" = v."key"
);

-- System categories: the old ones are found by icon and type
UPDATE "category" c
SET "key" = v."key", "name" = v."name", "icon" = v."icon", "color" = v."color"
FROM (VALUES
    ('goal', 'EXPENSE', 'goals', 'Goals', 'target', NULL::text),
    ('goal', 'INCOME', 'goals', 'Goals', 'target', NULL::text),
    ('credit-card', 'EXPENSE', 'card_payment', 'Card payment', 'credit-card', NULL::text),
    ('debt', 'EXPENSE', 'debts', 'Debts', 'landmark', '#7950F2'),
    ('debt', 'INCOME', 'debts', 'Debts', 'landmark', NULL::text),
    ('loan', 'EXPENSE', 'loans', 'Loans', 'hand-coins', NULL::text),
    ('loan', 'INCOME', 'loans', 'Loans', 'hand-coins', NULL::text)
) AS v("oldIcon", "type", "key", "name", "icon", "color")
WHERE c."key" IS NULL AND c."icon" = v."oldIcon" AND c."type" = v."type"::"transactionType";

INSERT INTO "category" ("id", "userId", "name", "key", "icon", "color", "type")
SELECT gen_random_uuid(), u."id", v."name", v."key", v."icon", v."color", v."type"::"transactionType"
FROM "user" u
CROSS JOIN (VALUES
    ('card_payment', 'Card payment', 'credit-card', NULL::text, 'EXPENSE'),
    ('goals', 'Goals', 'target', NULL::text, 'EXPENSE'),
    ('goals', 'Goals', 'target', NULL::text, 'INCOME'),
    ('debts', 'Debts', 'landmark', '#7950F2', 'EXPENSE'),
    ('debts', 'Debts', 'landmark', NULL::text, 'INCOME'),
    ('loans', 'Loans', 'hand-coins', NULL::text, 'EXPENSE'),
    ('loans', 'Loans', 'hand-coins', NULL::text, 'INCOME')
) AS v("key", "name", "icon", "color", "type")
WHERE NOT EXISTS (
  SELECT 1 FROM "category" e
  WHERE e."userId" = u."id" AND e."type" = v."type"::"transactionType" AND e."key" = v."key"
);

-- Relink the items of each old category to its equivalent in the new tree
UPDATE "transactions" i SET "categoryId" = n."id"
FROM "category" o
JOIN (VALUES
    ('salary', 'INCOME', 'salary'),
    ('home', 'EXPENSE', 'housing'),
    ('food', 'EXPENSE', 'food'),
    ('grocery', 'EXPENSE', 'supermarket'),
    ('fun', 'EXPENSE', 'leisure'),
    ('transport', 'EXPENSE', 'transport'),
    ('travel', 'EXPENSE', 'tourism'),
    ('education', 'EXPENSE', 'education'),
    ('clothes', 'EXPENSE', 'clothing'),
    ('other', 'EXPENSE', 'other')
) AS m("icon", "type", "key") ON m."icon" = o."icon" AND m."type"::"transactionType" = o."type"
JOIN "category" n ON n."userId" = o."userId" AND n."type" = o."type" AND n."key" = m."key"
WHERE i."categoryId" = o."id" AND o."key" IS NULL;

UPDATE "cardPurchase" i SET "categoryId" = n."id"
FROM "category" o
JOIN (VALUES
    ('salary', 'INCOME', 'salary'),
    ('home', 'EXPENSE', 'housing'),
    ('food', 'EXPENSE', 'food'),
    ('grocery', 'EXPENSE', 'supermarket'),
    ('fun', 'EXPENSE', 'leisure'),
    ('transport', 'EXPENSE', 'transport'),
    ('travel', 'EXPENSE', 'tourism'),
    ('education', 'EXPENSE', 'education'),
    ('clothes', 'EXPENSE', 'clothing'),
    ('other', 'EXPENSE', 'other')
) AS m("icon", "type", "key") ON m."icon" = o."icon" AND m."type"::"transactionType" = o."type"
JOIN "category" n ON n."userId" = o."userId" AND n."type" = o."type" AND n."key" = m."key"
WHERE i."categoryId" = o."id" AND o."key" IS NULL;

UPDATE "recurringCharge" i SET "categoryId" = n."id"
FROM "category" o
JOIN (VALUES
    ('salary', 'INCOME', 'salary'),
    ('home', 'EXPENSE', 'housing'),
    ('food', 'EXPENSE', 'food'),
    ('grocery', 'EXPENSE', 'supermarket'),
    ('fun', 'EXPENSE', 'leisure'),
    ('transport', 'EXPENSE', 'transport'),
    ('travel', 'EXPENSE', 'tourism'),
    ('education', 'EXPENSE', 'education'),
    ('clothes', 'EXPENSE', 'clothing'),
    ('other', 'EXPENSE', 'other')
) AS m("icon", "type", "key") ON m."icon" = o."icon" AND m."type"::"transactionType" = o."type"
JOIN "category" n ON n."userId" = o."userId" AND n."type" = o."type" AND n."key" = m."key"
WHERE i."categoryId" = o."id" AND o."key" IS NULL;

-- What is left: expense to Other, income to Other income, and card items in Debts or Loans to Other
UPDATE "transactions" i SET "categoryId" = n."id"
FROM "category" o
JOIN "category" n ON n."userId" = o."userId" AND n."type" = o."type"
  AND n."key" = CASE o."type" WHEN 'EXPENSE' THEN 'other' ELSE 'other_income' END
WHERE i."categoryId" = o."id" AND o."key" IS NULL;

UPDATE "cardPurchase" i SET "categoryId" = n."id"
FROM "category" o
JOIN "category" n ON n."userId" = o."userId" AND n."type" = o."type"
  AND n."key" = CASE o."type" WHEN 'EXPENSE' THEN 'other' ELSE 'other_income' END
WHERE i."categoryId" = o."id" AND o."key" IS NULL;

UPDATE "recurringCharge" i SET "categoryId" = n."id"
FROM "category" o
JOIN "category" n ON n."userId" = o."userId" AND n."type" = o."type"
  AND n."key" = CASE o."type" WHEN 'EXPENSE' THEN 'other' ELSE 'other_income' END
WHERE i."categoryId" = o."id" AND o."key" IS NULL;

UPDATE "cardPurchase" i SET "categoryId" = n."id"
FROM "category" o
JOIN "category" n ON n."userId" = o."userId" AND n."type" = 'EXPENSE' AND n."key" = 'other'
WHERE i."categoryId" = o."id" AND o."key" IN ('debts', 'loans');

UPDATE "recurringCharge" i SET "categoryId" = n."id"
FROM "category" o
JOIN "category" n ON n."userId" = o."userId" AND n."type" = 'EXPENSE' AND n."key" = 'other'
WHERE i."categoryId" = o."id" AND o."key" IN ('debts', 'loans');

-- Every old category is keyless and was replaced, so drop them
DELETE FROM "category" WHERE "key" IS NULL;
