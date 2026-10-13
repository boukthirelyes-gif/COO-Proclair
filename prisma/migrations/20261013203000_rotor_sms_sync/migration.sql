ALTER TABLE "RotorInboxMessage" ADD COLUMN "customerId" TEXT;
CREATE INDEX "RotorInboxMessage_customerId_messageAt_idx" ON "RotorInboxMessage"("customerId", "messageAt");
ALTER TABLE "RotorInboxMessage" ADD CONSTRAINT "RotorInboxMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "RotorSmsSyncControl" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "leaseUntil" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "lastImported" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RotorSmsSyncControl_pkey" PRIMARY KEY ("id")
);
