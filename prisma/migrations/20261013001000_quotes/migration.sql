CREATE TABLE "Quote" (
 "id" TEXT PRIMARY KEY, "customerId" TEXT NOT NULL REFERENCES "Customer"("id"),
 "number" TEXT UNIQUE, "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','ISSUED','ACCEPTED','DECLINED','VOID')),
 "validUntil" TEXT NOT NULL, "currency" TEXT NOT NULL DEFAULT 'CAD', "items" JSONB NOT NULL,
 "subtotalCents" INTEGER NOT NULL, "taxCents" INTEGER NOT NULL, "totalCents" INTEGER NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "idempotencyKey" TEXT NOT NULL UNIQUE, "payloadHash" TEXT NOT NULL,
 "decisionNote" TEXT, "issuedAt" TIMESTAMP(3), "acceptedAt" TIMESTAMP(3),
 "convertedInvoiceId" TEXT UNIQUE REFERENCES "Invoice"("id"), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Quote_customerId_status_idx" ON "Quote"("customerId", "status");
