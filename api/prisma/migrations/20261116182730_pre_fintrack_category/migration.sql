-- The "Before fintrack" system category of categories.constants.ts, for every
-- user created before it.
INSERT INTO "category" ("id", "userId", "name", "key", "icon", "type")
SELECT gen_random_uuid(), u."id", 'Before fintrack', 'pre_fintrack', 'receipt', 'EXPENSE'::"transactionType"
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM "category" e
  WHERE e."userId" = u."id" AND e."type" = 'EXPENSE'::"transactionType" AND e."key" = 'pre_fintrack'
);
