CREATE TABLE "CommunicationFollowUp" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "sourceKind" TEXT NOT NULL CHECK ("sourceKind" IN ('SMS','CALL')),
 "sourceId" TEXT NOT NULL,
 "phone" TEXT NOT NULL,
 "sourceFingerprint" TEXT NOT NULL,
 "draft" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','APPROVED','DONE','DISMISSED')),
 "dueAt" TIMESTAMP(3) NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
 "createdBy" TEXT NOT NULL,
 "approvedBy" TEXT,
 "approvedAt" TIMESTAMP(3),
 "completionNote" TEXT,
 "closedAt" TIMESTAMP(3),
 "dedupeKey" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "CommunicationFollowUp_dedupeKey_key" ON "CommunicationFollowUp"("dedupeKey");
CREATE INDEX "CommunicationFollowUp_phone_status_dueAt_idx" ON "CommunicationFollowUp"("phone","status","dueAt");
CREATE INDEX "CommunicationFollowUp_status_dueAt_idx" ON "CommunicationFollowUp"("status","dueAt");
