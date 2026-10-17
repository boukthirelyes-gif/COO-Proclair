ALTER TABLE "AccountMfa" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountMfa" ADD COLUMN "blockedUntil" TIMESTAMP(3);
ALTER TABLE "AccountMfa" ADD CONSTRAINT "AccountMfa_failedAttempts_check" CHECK ("failedAttempts">=0);
