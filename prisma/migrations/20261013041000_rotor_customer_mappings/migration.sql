CREATE TABLE "RotorCustomerMapping" (
 "externalId" TEXT PRIMARY KEY, "customerId" TEXT NOT NULL REFERENCES "Customer"("id"),
 "sourceSystem" TEXT NOT NULL DEFAULT 'ROTOR', "sourceHash" TEXT NOT NULL, "runId" TEXT NOT NULL REFERENCES "RotorImportRun"("id"),
 "decision" TEXT NOT NULL, "reviewNote" TEXT, "createdBy" TEXT NOT NULL, "lastSyncedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "syncStatus" TEXT NOT NULL DEFAULT 'REVIEWED', "syncError" TEXT,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "RotorCustomerMapping_customerId_idx" ON "RotorCustomerMapping"("customerId");
