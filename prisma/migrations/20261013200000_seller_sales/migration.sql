ALTER TABLE "Quote" ADD COLUMN "salesOwnerId" TEXT REFERENCES "AppUser"("id"), ADD COLUMN "sourceLeadId" TEXT REFERENCES "Lead"("id");
CREATE INDEX "Quote_salesOwnerId_sourceLeadId_idx" ON "Quote"("salesOwnerId","sourceLeadId");
ALTER TABLE "ServiceAgreement" ADD COLUMN "sourceLeadId" TEXT REFERENCES "Lead"("id"), ADD COLUMN "sourceQuoteId" TEXT UNIQUE REFERENCES "Quote"("id"), ADD COLUMN "submittedAt" TIMESTAMP(3);
CREATE INDEX "ServiceAgreement_salesOwnerId_sourceLeadId_idx" ON "ServiceAgreement"("salesOwnerId","sourceLeadId");
UPDATE "AppUser" SET "permissions"=array_append("permissions",'sales.write'),"sessionVersion"="sessionVersion"+1 WHERE "role"='ADMIN' AND NOT ('sales.write'=ANY("permissions"));
