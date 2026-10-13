CREATE TABLE "RotorFileImport" (
 "id" TEXT NOT NULL PRIMARY KEY, "checksum" TEXT NOT NULL UNIQUE,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('CUSTOMER','INVOICE','PAYMENT')),
 "rowCount" INTEGER NOT NULL CHECK ("rowCount" > 0), "createdBy" TEXT NOT NULL,
 "runId" TEXT REFERENCES "RotorImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "RotorFinancialArchive" (
 "id" TEXT NOT NULL PRIMARY KEY, "kind" TEXT NOT NULL CHECK ("kind" IN ('INVOICE','PAYMENT')),
 "externalId" TEXT NOT NULL, "customerExternalId" TEXT, "invoiceExternalId" TEXT,
 "amountCents" INTEGER NOT NULL, "currency" TEXT NOT NULL CHECK ("currency" = 'CAD'),
 "status" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL,
 "reference" TEXT, "method" TEXT, "contentHash" TEXT NOT NULL,
 "importId" TEXT NOT NULL REFERENCES "RotorFileImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "RotorFinancialArchive_kind_externalId_key" ON "RotorFinancialArchive"("kind","externalId");
CREATE INDEX "RotorFinancialArchive_customerExternalId_occurredAt_idx" ON "RotorFinancialArchive"("customerExternalId","occurredAt");
CREATE INDEX "RotorFinancialArchive_kind_occurredAt_id_idx" ON "RotorFinancialArchive"("kind","occurredAt","id");
