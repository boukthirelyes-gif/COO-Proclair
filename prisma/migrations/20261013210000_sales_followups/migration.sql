CREATE TABLE "SalesFollowUp" (
 "id" TEXT PRIMARY KEY,"sourceKind" TEXT NOT NULL CHECK("sourceKind" IN ('LEAD','QUOTE','AGREEMENT')),
 "sourceId" TEXT NOT NULL,"reason" TEXT NOT NULL,"sourceFingerprint" TEXT NOT NULL,"ownerId" TEXT REFERENCES "AppUser"("id"),
 "createdBy" TEXT NOT NULL,"draft" TEXT NOT NULL,"dueAt" TIMESTAMP(3) NOT NULL,"status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK("status" IN ('DRAFT','APPROVED','DONE','DISMISSED')),
 "version" INTEGER NOT NULL DEFAULT 1,"dedupeKey" TEXT NOT NULL UNIQUE,"approvedBy" TEXT,"approvedAt" TIMESTAMP(3),"completionNote" TEXT,"closedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SalesFollowUp_ownerId_status_dueAt_idx" ON "SalesFollowUp"("ownerId","status","dueAt");

ALTER TABLE "ServiceAgreement" ADD COLUMN "issuedAt" TIMESTAMP(3);
