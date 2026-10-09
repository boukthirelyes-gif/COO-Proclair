CREATE TABLE "Expense" (
 "id" TEXT PRIMARY KEY, "vendor" TEXT NOT NULL, "category" TEXT NOT NULL,
 "description" TEXT NOT NULL, "paidDate" TEXT NOT NULL, "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
 "currency" TEXT NOT NULL DEFAULT 'CAD', "reference" TEXT, "status" TEXT NOT NULL DEFAULT 'RECORDED' CHECK ("status" IN ('RECORDED','VOID')),
 "voidReason" TEXT, "version" INTEGER NOT NULL DEFAULT 1,
 "idempotencyKey" TEXT NOT NULL UNIQUE, "payloadHash" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Expense_paidDate_status_idx" ON "Expense"("paidDate", "status");
